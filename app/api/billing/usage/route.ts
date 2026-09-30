export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { featureEnabled, limitFor, type MeterKey } from "@/lib/billing/plans"
import { measureUsage, resolveAccountPlan } from "@/lib/billing/enforce"
import { judgeUsage } from "@/lib/billing/usage"

const METRICS: MeterKey[] = ["workspaces", "channels", "contacts", "aiReplies", "broadcasts", "seats"]

export async function GET(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const supabase = await getSupabaseBypassClient()
  const account = session.user
  const plan = await resolveAccountPlan(supabase, account)
  const billing = await supabase.from("billing_accounts").select("status, trial_ends_at, current_period_end, scheduled_plan_id, grace_until, dunning_step, interval, provider").eq("account_id", account.id).maybeSingle()
  const metrics = []
  for (const metric of METRICS) {
    const used = await measureUsage(supabase, account.id, metric, new Date(), session.workspace?.id)
    metrics.push(judgeUsage({ metric, used, limit: limitFor(plan, metric), adding: 0, blocked: plan.blocked }))
  }
  return NextResponse.json({
    plan: {
      id: plan.id,
      name: plan.name,
      audience: plan.audience,
      monthlyUsd: plan.monthlyUsd,
      yearlyUsd: plan.yearlyUsd,
      blocked: plan.blocked,
      limits: plan.limits,
    },
    status: billing.data?.status || (account.plan === "trial" ? "trialing" : plan.blocked ? "expired" : "active"),
    trialEndsAt: billing.data?.trial_ends_at || account.trial_ends_at || null,
    periodEnd: billing.data?.current_period_end || null,
    scheduledPlanId: billing.data?.scheduled_plan_id || null,
    graceUntil: billing.data?.grace_until || null,
    dunningStep: billing.data?.dunning_step || 0,
    features: {
      whiteLabel: featureEnabled(plan, "whiteLabel"),
      apiAccess: featureEnabled(plan, "apiAccess"),
    },
    metrics,
    warnings: metrics.filter((metric) => metric.level !== "ok").map((metric) => metric.message),
  })
}
