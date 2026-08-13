export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getSupabaseServerClient } from "@/lib/supabase-server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2026-07-29.dahlia",
})

async function getAccountIdForUser(supabase: any, userId: number) {
  const { data } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", userId)
    .maybeSingle()
  return data?.account_id ?? null
}

async function upsertSubscription(supabase: any, payload: any) {
  const existing = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", payload.user_id)
    .maybeSingle()

  if (existing.data) {
    await supabase.from("subscriptions").update(payload).eq("id", existing.data.id)
  } else {
    await supabase.from("subscriptions").insert(payload)
  }
}

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events to update user plans and subscriptions.
 * Plan/trial source of truth is `accounts`; mirrored to `users`.
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
  const now = new Date().toISOString()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const accountId = session.metadata?.accountId
        const planType = session.metadata?.planType as "monthly" | "one_time"

        if (!userId || !planType) {
          console.error("[stripe/webhook] Missing metadata on session:", session.id)
          break
        }

        const resolvedAccountId =
          accountId || (await getAccountIdForUser(supabase, Number(userId)))

        const customerId = session.customer as string | null
        const stripeSubId =
          planType === "monthly" ? ((session.subscription as string) ?? null) : null

        // Source of truth: accounts
        if (resolvedAccountId) {
          await supabase
            .from("accounts")
            .update({
              plan: planType,
              trial_ends_at: null,
              stripe_customer_id: customerId,
              updated_at: now,
            })
            .eq("id", resolvedAccountId)
        }

        // Mirror to users
        await supabase
          .from("users")
          .update({
            plan: planType,
            trial_ends_at: null,
            stripe_customer_id: customerId,
            updated_at: now,
          })
          .eq("id", Number(userId))

        await upsertSubscription(supabase, {
          user_id: Number(userId),
          stripe_subscription_id: stripeSubId,
          plan_type: planType,
          status: "active",
          current_period_end: null,
          payment_method: "stripe",
          updated_at: now,
        })

        console.log(`[stripe/webhook] ✅ Checkout complete — user ${userId} → plan ${planType}`)
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

        if (user) {
          if (user.account_id) {
            await supabase
              .from("accounts")
              .update({ plan: "monthly", trial_ends_at: null, updated_at: now })
              .eq("id", user.account_id)
          }

          await supabase
            .from("users")
            .update({
              plan: "monthly",
              trial_ends_at: null,
              updated_at: now,
            })
            .eq("id", user.id)

          const currentPeriodEnd = invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : null

          await upsertSubscription(supabase, {
            user_id: user.id,
            plan_type: "monthly",
            status: "active",
            current_period_end: currentPeriodEnd,
            payment_method: "stripe",
            updated_at: now,
          })

          console.log(`[stripe/webhook] ✅ Invoice paid — user ${user.id} renewed`)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: user } = await supabase
          .from("users")
          .select("id, account_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()

        if (user) {
          if (user.account_id) {
            await supabase
              .from("accounts")
              .update({ plan: "expired", updated_at: now })
              .eq("id", user.account_id)
          }

          await supabase
            .from("users")
            .update({ plan: "expired", updated_at: now })
            .eq("id", user.id)

          await upsertSubscription(supabase, {
            user_id: user.id,
            stripe_subscription_id: subscription.id,
            plan_type: "expired",
            status: "canceled",
            updated_at: now,
          })

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

