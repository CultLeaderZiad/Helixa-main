// Stripe webhook. Source of truth for entitlement is billing_accounts; the legacy
// mirrors (accounts, users, subscriptions) follow through activation.ts. Every
// Supabase error is checked. The Stripe SDK verifies the signature.
//
// Events handled:
//   - checkout.session.completed      → activate the plan (interval derived, never hard-coded)
//   - invoice.paid                    → renew the period (interval derived from the Stripe price)
//   - invoice.payment_failed          → mark past_due (grace window starts)
//   - customer.subscription.updated   → sync status/interval/period/cancel flag
//   - customer.subscription.deleted   → deactivatePlan
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { sendPaymentReceipt, getEmailForAccountId } from "@/lib/receipt-emails"
import { activatePlan, deactivatePlan, legacyPlanValue } from "@/lib/billing/activation"
import { minorUnits } from "@/lib/money"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = new Stripe(stripeKey || "sk_test_placeholder_do_not_use", {
  apiVersion: "2026-08-26.dahlia",
})

async function getAccountIdForUser(supabase: any, userId: number) {
  const { data } = await supabase.from("users").select("account_id").eq("id", userId).maybeSingle()
  return data?.account_id ?? null
}

function toIso(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return new Date(value * 1000).toISOString()
}

function intervalOf(value: unknown): "month" | "year" {
  return String(value || "") === "year" ? "year" : "month"
}

/** Map a Stripe subscription status onto the billing_accounts CHECK set. */
function billingStatusOf(status: string): "active" | "trialing" | "past_due" | "canceled" {
  if (status === "active") return "active"
  if (status === "trialing") return "trialing"
  if (status === "past_due" || status === "unpaid") return "past_due"
  return "canceled"
}

export async function POST(request: NextRequest) {
  if (!stripeKey || stripeKey === "sk_test_placeholder_do_not_use") {
    console.error("[stripe/webhook] STRIPE_SECRET_KEY is not configured. Ignoring webhook.")
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 })
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not configured.")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig || "", process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error("[stripe/webhook] Signature verification failed:", err?.message ?? err)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  const supabase = await getSupabaseBypassClient()
  const now = new Date().toISOString()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const accountId = session.metadata?.accountId
        const helixaPlan = session.metadata?.helixaPlan
        const storedPlan = helixaPlan || session.metadata?.planType

        if ((!userId && !accountId) || !storedPlan) {
          console.error("[stripe/webhook] Missing metadata on session:", session.id)
          break
        }

        const resolvedAccountId = accountId || (await getAccountIdForUser(supabase, Number(userId)))
        if (!resolvedAccountId) {
          console.error("[stripe/webhook] No account resolved for checkout session:", session.id)
          break
        }

        // The interval comes from the signed metadata, never a hard-coded month.
        const interval = intervalOf(session.metadata?.interval || session.metadata?.planType)
        const stripeSubId = session.subscription ? String(session.subscription) : session.id
        const periodEnd = session.subscription && (session.subscription as any).current_period_end != null
          ? toIso((session.subscription as any).current_period_end)
          : null

        try {
          await activatePlan({
            accountId: resolvedAccountId,
            planId: storedPlan,
            interval,
            source: "stripe",
            providerRef: stripeSubId,
            periodEnd,
          })
        } catch (activateError: any) {
          console.error("[stripe/webhook] activatePlan failed:", activateError?.message ?? activateError)
          throw activateError
        }

        try {
          const currency = (session.currency || "usd").toUpperCase()
          const toEmail = session.customer_details?.email || (await getEmailForAccountId(resolvedAccountId))
          if (toEmail) {
            await sendPaymentReceipt({
              to: toEmail,
              planName: `${storedPlan} (${interval}ly subscription)`,
              amount: (session.amount_total ?? 0) / 10 ** minorUnits(currency),
              currency,
              paymentMethod: "stripe",
            })
          }
        } catch (e) {
          console.error("[stripe/webhook] Receipt email failed (non-blocking):", e)
        }

        console.log(`[stripe/webhook] ✅ Checkout complete — account ${resolvedAccountId} → ${storedPlan} (${interval})`)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: user } = await supabase
          .from("users")
          .select("id, account_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()

        if (!user?.account_id) break

        const firstLine = invoice.lines?.data?.[0] as any
        const interval = intervalOf(firstLine?.price?.recurring?.interval)
        const periodEnd = toIso(invoice.period_end)

        // A renewal simply re-activates the same plan (idempotent). Keep the plan
        // already on the account so a price change cannot silently re-tier it.
        const { data: billing } = await supabase
          .from("billing_accounts")
          .select("plan_id")
          .eq("account_id", user.account_id)
          .maybeSingle()
        const planId = billing?.plan_id || "creator"

        try {
          await activatePlan({
            accountId: user.account_id,
            planId,
            interval,
            source: "stripe",
            providerRef: customerId,
            periodEnd,
          })
        } catch (activateError: any) {
          console.error("[stripe/webhook] activatePlan (invoice.paid) failed:", activateError?.message ?? activateError)
          throw activateError
        }

        try {
          const currency = (invoice.currency || "usd").toUpperCase()
          const toEmail = invoice.customer_email || (await getEmailForAccountId(user.account_id))
          if (toEmail) {
            await sendPaymentReceipt({
              to: toEmail,
              planName: `${planId} (${interval}ly subscription)`,
              amount: invoice.amount_paid / 10 ** minorUnits(currency),
              currency,
              paymentMethod: "stripe",
              isRenewal: true,
              billingPeriod: periodEnd ? new Date(periodEnd).toLocaleDateString() : undefined,
            })
          }
        } catch (e) {
          console.error("[stripe/webhook] Receipt email failed (non-blocking):", e)
        }

        console.log(`[stripe/webhook] ✅ Invoice paid — account ${user.account_id} renewed`)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: user } = await supabase
          .from("users")
          .select("id, account_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()
        if (!user?.account_id) break

        // Keep the plan for the grace window; gating reads status='past_due'.
        const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        const { error } = await supabase
          .from("billing_accounts")
          .update({ status: "past_due", grace_until: graceUntil, dunning_step: 1, updated_at: now })
          .eq("account_id", user.account_id)
        if (error) throw error

        console.log(`[stripe/webhook] Payment failed — account ${user.account_id} past due`)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as unknown as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: user } = await supabase
          .from("users")
          .select("id, account_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()
        if (!user?.account_id) break

        const interval = intervalOf(subscription.items?.data?.[0]?.price?.recurring?.interval)
        const status = billingStatusOf(String(subscription.status))
        // cancel_at_period_end keeps status='active' until the period actually ends.
        const cancelAtPeriodEnd = Boolean((subscription as any).cancel_at_period_end)
        const periodEnd = toIso((subscription as any).current_period_end)

        const { error } = await supabase
          .from("billing_accounts")
          .update({
            status,
            interval,
            cancel_at_period_end: cancelAtPeriodEnd,
            current_period_end: periodEnd,
            updated_at: now,
          })
          .eq("account_id", user.account_id)
        if (error) throw error

        // Mirror the entitlement into the legacy columns (safe legacy values only).
        const { data: billing } = await supabase
          .from("billing_accounts")
          .select("plan_id")
          .eq("account_id", user.account_id)
          .maybeSingle()
        const legacy = status === "canceled" ? "expired" : legacyPlanValue(billing?.plan_id || "creator")

        const { error: accountError } = await supabase
          .from("accounts")
          .update({ plan: legacy, updated_at: now })
          .eq("id", user.account_id)
        if (accountError) throw accountError
        const { error: userError } = await supabase
          .from("users")
          .update({ plan: legacy, updated_at: now })
          .eq("account_id", user.account_id)
        if (userError) throw userError

        console.log(`[stripe/webhook] 🔁 Subscription updated — account ${user.account_id} → ${status}`)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as unknown as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: user } = await supabase
          .from("users")
          .select("id, account_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()
        if (!user?.account_id) break

        await deactivatePlan({
          accountId: user.account_id,
          source: "stripe",
          providerRef: subscription.id,
        })

        console.log(`[stripe/webhook] ⚠️ Subscription deleted — account ${user.account_id} → expired`)
        break
      }

      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[stripe/webhook] Processing error:", error?.message ?? error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
