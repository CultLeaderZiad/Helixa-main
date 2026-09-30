export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { startTrial } from "@/lib/billing/lifecycle"

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const supabase = await getSupabaseBypassClient()
  const existing = await supabase.from("billing_accounts").select("trial_ends_at, status, plan_id").eq("account_id", session.user.id).maybeSingle()
  const decision = startTrial({
    currentPlan: session.user.plan || "trial",
    requestedPlan: String(body.planId || "creator"),
    alreadyTrialed: Boolean(existing.data?.trial_ends_at),
    nowMs: Date.now(),
  })
  if (!decision.ok) return NextResponse.json({ error: decision.error }, { status: 409 })
  const saved = await supabase.from("billing_accounts").upsert({
    account_id: session.user.id,
    plan_id: decision.planId,
    status: "trialing",
    trial_ends_at: decision.trialEndsAt,
    interval: "month",
    updated_at: new Date().toISOString(),
  }, { onConflict: "account_id" })
  if (saved.error) return NextResponse.json({ error: saved.error.message }, { status: 503 })
  await supabase.from("accounts").update({ plan: decision.planId, trial_ends_at: decision.trialEndsAt, updated_at: new Date().toISOString() }).eq("id", session.user.id)
  return NextResponse.json({ planId: decision.planId, trialEndsAt: decision.trialEndsAt, status: "trialing" })
}
