export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { startTrial } from "@/lib/billing/lifecycle"
import { startTrialPlan } from "@/lib/billing/activation"

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
  try {
    await startTrialPlan({ accountId: session.user.id, planId: decision.planId, trialEndsAt: decision.trialEndsAt })
  } catch (error: any) {
    console.error("[billing/trial] activation failed:", error?.message ?? error)
    return NextResponse.json({ error: "Could not start the trial." }, { status: 503 })
  }
  return NextResponse.json({ planId: decision.planId, trialEndsAt: decision.trialEndsAt, status: "trialing" })
}
