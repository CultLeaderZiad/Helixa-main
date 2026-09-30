export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = new Stripe(stripeKey || "sk_test_placeholder_do_not_use", {
  apiVersion: "2026-08-26.dahlia",
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
  if (!stripeKey || stripeKey === "sk_test_placeholder_do_not_use") {
    console.error("[stripe/webhook] STRIPE_SECRET_KEY is not configured. Ignoring webhook.")
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 })
  }

  const body = await request.text()
  const sig = request.headers.get("stripe-signature")!

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET is not configured.")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: any) {
    console.error("[stripe/webhook] Signature verification failed:", err.message)
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
        const planType = session.metadata?.planType as "monthly" | "one_time" | undefined
        const helixaPlan = session.metadata?.helixaPlan
        const storedPlan = helixaPlan || planType

        if ((!userId && !accountId) || !storedPlan) {
          console.error("[stripe/webhook] Missing metadata on session:", session.id)
          break
        }

        const resolvedAccountId =
          accountId || (await getAccountIdForUser(supabase, Number(userId)))

        const customerId = session.customer as string | null
        const stripeSubId = session.subscription ? String(session.subscription) : null

        // Source of truth: accounts
        if (resolvedAccountId) {
          await supabase
            .from("accounts")
            .update({
              plan: storedPlan,
              trial_ends_at: null,
              stripe_customer_id: customerId,
              updated_at: now,
            })
            .eq("id", resolvedAccountId)
          if (helixaPlan) {
            await supabase.from("billing_accounts").upsert({
              account_id: resolvedAccountId,
              plan_id: helixaPlan,
              status: "active",
              provider: "stripe",
              provider_customer_id: customerId,
              provider_subscription_id: stripeSubId,
              interval: session.metadata?.interval === "year" ? "year" : "month",
              dunning_step: 0,
              grace_until: null,
              updated_at: now,
            }, { onConflict: "account_id" })
          }
        }

        // Mirror to users
        if (userId && Number.isFinite(Number(userId))) {
        await supabase
          .from("users")
          .update({
            plan: storedPlan,
            trial_ends_at: null,
            stripe_customer_id: customerId,
            updated_at: now,
          })
          .eq("id", Number(userId))

        await upsertSubscription(supabase, {
          user_id: Number(userId),
          stripe_subscription_id: stripeSubId,
          plan_type: storedPlan,
          status: "active",
          current_period_end: null,
          payment_method: "stripe",
          updated_at: now,
        })

        }
        console.log(`[stripe/webhook] ✅ Checkout complete — user ${userId || accountId} → plan ${storedPlan}`)
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
          let renewedPlan = "monthly"
          if (user.account_id) {
            const billing = await supabase.from("billing_accounts").select("plan_id").eq("account_id", user.account_id).maybeSingle()
            if (billing.data?.plan_id) renewedPlan = billing.data.plan_id
            await supabase
              .from("accounts")
              .update({ plan: renewedPlan, trial_ends_at: null, updated_at: now })
              .eq("id", user.account_id)
            if (billing.data) {
              await supabase.from("billing_accounts").update({
                status: "active",
                dunning_step: 0,
                grace_until: null,
                current_period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
                updated_at: now,
              }).eq("account_id", user.account_id)
            }
          }

          await supabase
            .from("users")
            .update({
              plan: renewedPlan,
              trial_ends_at: null,
              updated_at: now,
            })
            .eq("id", user.id)

          const currentPeriodEnd = invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : null

          await upsertSubscription(supabase, {
            user_id: user.id,
            plan_type: renewedPlan,
            status: "active",
            current_period_end: currentPeriodEnd,
            payment_method: "stripe",
            updated_at: now,
          })

          console.log(`[stripe/webhook] ✅ Invoice paid — user ${user.id} renewed`)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: user } = await supabase.from("users").select("id, account_id").eq("stripe_customer_id", customerId).maybeSingle()
        if (user?.account_id) {
          const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          await supabase.from("billing_accounts").update({
            status: "past_due",
            grace_until: graceUntil,
            dunning_step: 1,
            updated_at: now,
          }).eq("account_id", user.account_id)
          console.log(`[stripe/webhook] Payment failed — account ${user.account_id} past due`)
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

