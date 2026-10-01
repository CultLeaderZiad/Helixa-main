export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { requireUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = new Stripe(stripeKey || "sk_test_placeholder_do_not_use", {
  apiVersion: "2026-08-26.dahlia",
})

/**
 * POST /api/stripe/cancel
 * Cancels the caller's Stripe subscription at period end (access preserved until then).
 * The customer.subscription.deleted webhook fires when the period actually ends and
 * flips the plan to expired — we don't do that here so the paid period is honored.
 */
export async function POST(request: NextRequest) {
  if (!stripeKey || stripeKey === "sk_test_placeholder_do_not_use") {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 })
  }

  const result = await requireUser(request)
  if (result.response) return result.response
  const { user: account } = result

  try {
    const supabase = await getSupabaseBypassClient()

    // Resolve users.id (int64) from the account UUID — subscriptions key by users.id
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .eq("account_id", account.id)
      .maybeSingle()

    if (!userRow) {
      return NextResponse.json({ error: "No active Stripe subscription found to cancel." }, { status: 404 })
    }

    // Find the active Stripe subscription for this user
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, stripe_subscription_id, plan_type, status, current_period_end")
      .eq("user_id", userRow.id)
      .maybeSingle()

    if (!sub || sub.plan_type !== "monthly" || sub.status !== "active" || !sub.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active Stripe subscription found to cancel." },
        { status: 404 }
      )
    }

    // Cancel at period end — user keeps access until the paid period ends.
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Mark locally so the UI can show pending-cancellation state immediately.
    await supabase
      .from("subscriptions")
      .update({ status: "canceling", updated_at: new Date().toISOString() })
      .eq("user_id", userRow.id)

    return NextResponse.json({
      success: true,
      periodEnd: sub.current_period_end,
      message: "Subscription canceled. It stays active until the end of the paid period.",
    })
  } catch (error: any) {
    console.error("[stripe/cancel] Error:", error)
    return NextResponse.json({ error: error.message || "Failed to cancel subscription" }, { status: 500 })
  }
}
