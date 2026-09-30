export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { schedulePlanChange } from "@/lib/billing/lifecycle"
import { resolvePlan } from "@/lib/billing/plans"

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const next = resolvePlan(String(body.planId || ""))
  if (!body.planId || next.id === "expired") return NextResponse.json({ error: "Unknown plan." }, { status: 400 })
  const supabase = await getSupabaseBypassClient()
  const billing = await supabase.from("billing_accounts").select("plan_id, status, current_period_end").eq("account_id", session.user.id).maybeSingle()
  const currentPlan = billing.data?.plan_id || session.user.plan || "creator_free"
  const change = schedulePlanChange({
    currentPlan,
    nextPlan: next.id,
    periodEnd: billing.data?.current_period_end || null,
    nowMs: Date.now(),
  })
  if (change.requiresPayment) {
    return NextResponse.json({ checkoutRequired: true, planId: next.id })
  }
  if (change.immediatePlan) {
    await supabase.from("accounts").update({ plan: change.immediatePlan, updated_at: new Date().toISOString() }).eq("id", session.user.id)
    await supabase.from("billing_accounts").upsert({
      account_id: session.user.id,
      plan_id: change.immediatePlan,
      status: change.immediatePlan === "creator_free" ? "active" : billing.data?.status || "active",
      scheduled_plan_id: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" })
    return NextResponse.json({ applied: change.immediatePlan })
  }
  if (change.scheduledPlan) {
    await supabase.from("billing_accounts").upsert({
      account_id: session.user.id,
      plan_id: resolvePlan(currentPlan).id,
      status: billing.data?.status || "active",
      scheduled_plan_id: change.scheduledPlan,
      current_period_end: billing.data?.current_period_end || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "account_id" })
    return NextResponse.json({ scheduled: change.scheduledPlan, at: billing.data?.current_period_end || null })
  }
  return NextResponse.json({ unchanged: true })
}
