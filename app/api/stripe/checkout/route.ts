import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getSessionUser } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
 * Body: { planType: "monthly" | "one_time" }
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request)
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { planType } = await request.json()

    if (!planType || !PLANS[planType as keyof typeof PLANS]) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 })
    }

    const plan = PLANS[planType as keyof typeof PLANS]
    const supabase = await getSupabaseServerClient()

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { userId: String(user.id), username: user.username },
      })
      customerId = customer.id
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: plan.mode,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing?canceled=true`,
      metadata: {
        userId: String(user.id),
        planType,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("[stripe/checkout] Error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
