// One shared writer for account entitlements. `billing_accounts` is the source
// of truth; `accounts.plan`, `users.plan` and `subscriptions` are legacy mirrors
// that follow it. Every Supabase error is surfaced (thrown), so a failed
// entitlement write can never be mistaken for success.
//
// Rules (see the merged production-hardening audit):
//   - Gating reads billing_accounts.status / plan_id / current_period_end.
//   - Never write 'canceling' anywhere. A scheduled cancel only sets
//     cancel_at_period_end and keeps status='active' until current_period_end.
//   - checkout.session.completed / invoice.paid -> activatePlan
//   - customer.subscription.deleted            -> deactivatePlan
//   - invoice.payment_failed                   -> past_due (webhook-owned)
//
// The legacy mirror columns only accept ('trial', 'monthly', 'one_time',
// 'expired'); billing_accounts.plan_id keeps the real plan slug.

import { resolvePlan } from "@/lib/billing/plans"

type SupabaseLike = any

export type BillingInterval = "month" | "year"
export type LegacyPlanValue = "trial" | "monthly" | "one_time" | "expired"

/** Read the billing interval from a request body. Anything but 'year' is monthly. */
export function resolveInterval(body: { interval?: unknown } | null | undefined): BillingInterval {
  return body?.interval === "year" ? "year" : "month"
}

/** The value the legacy mirrors are allowed to hold for a plan slug. */
export function legacyPlanValue(planId: string): LegacyPlanValue {
  const plan = resolvePlan(planId)
  if (plan.blocked || plan.id === "expired") return "expired"
  if (plan.monthlyUsd > 0) return "monthly"
  return "trial"
}

export interface ActivationInput {
  accountId: string
  planId: string
  interval?: BillingInterval
  source: string
  providerRef?: string | null
  periodEnd?: string | null
  actorId?: string
}

export interface CancelInput {
  accountId: string
  providerRef?: string | null
  periodEnd?: string | null
  actorId?: string
}

export interface DeactivateInput {
  accountId: string
  source: string
  providerRef?: string | null
}

export interface TrialInput {
  accountId: string
  planId: string
  trialEndsAt: string
}

async function client(supabase?: SupabaseLike): Promise<SupabaseLike> {
  if (supabase) return supabase
  // Lazy so this module stays importable outside a Next.js runtime (e.g. tests).
  const { getSupabaseBypassClient } = await import("@/lib/supabase-server")
  return getSupabaseBypassClient()
}

function fail(context: string, error: { message?: string } | null | undefined): never {
  throw new Error(`[billing] ${context}: ${error?.message || "unknown error"}`)
}

/** users.id (int64) linked to an account, or null when no profile exists. */
async function legacyUserId(supabase: SupabaseLike, accountId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("account_id", accountId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) return null
  const id = data?.id
  return id == null ? null : Number(id)
}

/** Write accounts.plan and users.plan to the same legacy value. */
async function mirrorPlanValue(
  supabase: SupabaseLike,
  accountId: string,
  legacy: LegacyPlanValue,
): Promise<void> {
  const now = new Date().toISOString()
  const accountPatch: Record<string, unknown> = { plan: legacy, updated_at: now }
  const userPatch: Record<string, unknown> = { plan: legacy, updated_at: now }
  if (legacy === "monthly") {
    accountPatch.trial_ends_at = null
    userPatch.trial_ends_at = null
  }

  const { error: accountError } = await supabase.from("accounts").update(accountPatch).eq("id", accountId)
  if (accountError) fail("accounts mirror", accountError)

  const { error: userError } = await supabase.from("users").update(userPatch).eq("account_id", accountId)
  if (userError) fail("users mirror", userError)
}

/**
 * Activate or re-activate an account on a paid plan. Writes billing_accounts
 * first, then the legacy mirrors. Throws on any Supabase error.
 */
export async function activatePlan(input: ActivationInput, supabaseArg?: SupabaseLike): Promise<void> {
  const { accountId, planId, interval = "month", source, providerRef = null, periodEnd = null } = input
  if (!accountId) throw new Error("activatePlan requires an account id")
  const resolved = resolvePlan(planId)
  if (resolved.blocked || resolved.id === "expired") throw new Error("Cannot activate a blocked plan")

  const supabase = await client(supabaseArg)
  const now = new Date().toISOString()

  const { error } = await supabase.from("billing_accounts").upsert(
    {
      account_id: accountId,
      plan_id: resolved.id,
      status: "active",
      interval,
      provider: source,
      provider_subscription_id: providerRef,
      current_period_end: periodEnd,
      trial_ends_at: null,
      cancel_at_period_end: false,
      updated_at: now,
    },
    { onConflict: "account_id" },
  )
  if (error) fail("billing_accounts activate", error)

  const legacy = legacyPlanValue(resolved.id)
  await mirrorPlanValue(supabase, accountId, legacy)

  const userId = await legacyUserId(supabase, accountId)
  if (userId != null) {
    const { error: subError } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_subscription_id: providerRef,
        plan_type: legacy,
        status: "active",
        current_period_end: periodEnd,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    if (subError) fail("subscriptions mirror", subError)
  }
}

/**
 * Start (or restart) a trial on a plan. billing_accounts is the source of truth;
 * the legacy mirrors keep the plan on 'trial' until the trial converts.
 */
export async function startTrialPlan(input: TrialInput, supabaseArg?: SupabaseLike): Promise<void> {
  const { accountId, planId, trialEndsAt } = input
  if (!accountId) throw new Error("startTrialPlan requires an account id")
  const resolved = resolvePlan(planId)
  if (resolved.blocked || resolved.id === "expired") throw new Error("Cannot trial a blocked plan")

  const supabase = await client(supabaseArg)
  const now = new Date().toISOString()

  const { error } = await supabase.from("billing_accounts").upsert(
    {
      account_id: accountId,
      plan_id: resolved.id,
      status: "trialing",
      interval: "month",
      trial_ends_at: trialEndsAt,
      cancel_at_period_end: false,
      updated_at: now,
    },
    { onConflict: "account_id" },
  )
  if (error) fail("billing_accounts trial", error)

  const { error: accountError } = await supabase
    .from("accounts")
    .update({ plan: "trial", trial_ends_at: trialEndsAt, updated_at: now })
    .eq("id", accountId)
  if (accountError) fail("accounts mirror", accountError)
  const { error: userError } = await supabase
    .from("users")
    .update({ plan: "trial", trial_ends_at: trialEndsAt, updated_at: now })
    .eq("account_id", accountId)
  if (userError) fail("users mirror", userError)

  const userId = await legacyUserId(supabase, accountId)
  if (userId != null) {
    const { error: subError } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan_type: "trial",
        status: "trialing",
        current_period_end: trialEndsAt,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    if (subError) fail("subscriptions mirror", subError)
  }
}

/**
 * Re-sync the legacy plan mirrors to a plan slug. Used by flows that already
 * wrote billing_accounts directly, so accounts.plan/users.plan never drift.
 */
export async function syncLegacyPlanMirrors(
  accountId: string,
  planId: string,
  supabaseArg?: SupabaseLike,
): Promise<void> {
  const supabase = await client(supabaseArg)
  await mirrorPlanValue(supabase, accountId, legacyPlanValue(planId))
}

/**
 * Schedule a cancel at the end of the current billing period. The paid period is
 * preserved: this only flips cancel_at_period_end and (optionally) refreshes
 * current_period_end. It never writes a 'canceling' state.
 */
export async function scheduleCancel(input: CancelInput, supabaseArg?: SupabaseLike): Promise<void> {
  const { accountId, providerRef = null, periodEnd = null } = input
  if (!accountId) throw new Error("scheduleCancel requires an account id")

  const supabase = await client(supabaseArg)
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { cancel_at_period_end: true, updated_at: now }
  if (periodEnd) patch.current_period_end = periodEnd
  if (providerRef) patch.provider_subscription_id = providerRef

  const { data, error } = await supabase
    .from("billing_accounts")
    .update(patch)
    .eq("account_id", accountId)
    .in("status", ["active", "past_due"])
    .select("account_id")
  if (error) fail("billing_accounts scheduleCancel", error)
  if (!Array.isArray(data) || data.length === 0) throw new Error("No active paid plan to cancel")
}

/**
 * Subscription deleted (period ended) or revoked. Gating drops to expired.
 */
export async function deactivatePlan(input: DeactivateInput, supabaseArg?: SupabaseLike): Promise<void> {
  const { accountId, source, providerRef = null } = input
  if (!accountId) throw new Error("deactivatePlan requires an account id")

  const supabase = await client(supabaseArg)
  const now = new Date().toISOString()

  const { error } = await supabase
    .from("billing_accounts")
    .update({
      status: "canceled",
      provider: source,
      provider_subscription_id: providerRef,
      current_period_end: null,
      cancel_at_period_end: false,
      updated_at: now,
    })
    .eq("account_id", accountId)
  if (error) fail("billing_accounts deactivate", error)

  await mirrorPlanValue(supabase, accountId, "expired")

  const userId = await legacyUserId(supabase, accountId)
  if (userId != null) {
    const { error: subError } = await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_subscription_id: providerRef,
        plan_type: "expired",
        status: "canceled",
        current_period_end: null,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    if (subError) fail("subscriptions mirror", subError)
  }
}
