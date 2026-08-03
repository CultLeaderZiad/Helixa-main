import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getSupabaseServerClient } from "@/lib/supabase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2026-07-29.dahlia",
})

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events to update user plans and subscriptions.
 * This is a separate file from the Instagram webhook — DO NOT merge them.
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error("[stripe/webhook] Signature verification failed:", err.message)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  const supabase = await getSupabaseServerClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const planType = session.metadata?.planType as "monthly" | "one_time"

        if (!userId || !planType) {
          console.error("[stripe/webhook] Missing metadata on session:", session.id)
          break
        }

        // Update user plan and clear trial
        await supabase
          .from("users")
          .update({
            plan: planType,
            trial_ends_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId)

        // Upsert subscription record
        const subStatus = planType === "monthly" ? "active" : "active"
        const stripeSubId =
          planType === "monthly"
            ? (session.subscription as string) ?? null
            : null

        await supabase.from("subscriptions").upsert(
          {
            user_id: Number(userId),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: stripeSubId,
            plan_type: planType,
            status: subStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

        console.log(`[stripe/webhook] ✅ Checkout complete — user ${userId} → plan ${planType}`)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: user } = await supabase
          .from("users")
          .select("id, plan")
          .eq("stripe_customer_id", customerId)
          .single()

        if (user) {
          await supabase
            .from("users")
            .update({
              plan: "monthly",
              trial_ends_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id)

          await supabase.from("subscriptions").upsert(
            {
              user_id: user.id,
              stripe_customer_id: customerId,
              plan_type: "monthly",
              status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          )

          console.log(`[stripe/webhook] ✅ Invoice paid — user ${user.id} renewed`)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: user } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single()

        if (user) {
          await supabase
            .from("users")
            .update({
              plan: "expired",
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id)

          await supabase.from("subscriptions").upsert(
            {
              user_id: user.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              plan_type: "expired",
              status: "canceled",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          )

          console.log(`[stripe/webhook] ⚠️ Subscription canceled — user ${user.id} → expired`)
        }
        break
      }

      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[stripe/webhook] Processing error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
