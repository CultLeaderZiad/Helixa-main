export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { requireUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  console.error("[stripe/checkout] STRIPE_SECRET_KEY is not configured. Payments will not work.")
}
const stripe = new Stripe(stripeKey || "sk_test_placeholder_do_not_use", {
  apiVersion: "2026-07-29.dahlia",
})

const PLANS = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID!,
    mode: "subscription" as const,
  },
  one_time: {
    priceId: process.env.STRIPE_ONE_TIME_PRICE_ID!,
    mode: "payment" as const,
  },
}

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for monthly or one_time plan.
 * Requires a connected Instagram account (users int64 row).
 * Body: { planType: "monthly" | "one_time" }
 */
export async function POST(request: NextRequest) {
  const result = await requireUser(request)
  if (result.response) return result.response
  const { user: account } = result

  try {
    if (!stripeKey) {
      return NextResponse.json({ error: "Payments are not configured. Please contact support." }, { status: 503 })
    }

    const { planType } = await request.json()

    if (!planType || !PLANS[planType as keyof typeof PLANS]) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 })
    }

    const plan = PLANS[planType as keyof typeof PLANS]
    const supabase = await getSupabaseBypassClient()

    // Get or create Stripe customer. Source of truth is accounts; mirrored to users
    // so webhook lookups (users.stripe_customer_id) keep working.
    let customerId = account.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId: String(account.id), accountId: account.id, email: account.email },
      })
      customerId = customer.id
      await supabase
        .from("accounts")
        .update({ stripe_customer_id: customerId })
        .eq("id", account.id)
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", account.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: plan.mode,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing?canceled=true`,
      metadata: {
        userId: String(account.id),
        accountId: account.id,
        email: account.email,
        planType,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("[stripe/checkout] Error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}

