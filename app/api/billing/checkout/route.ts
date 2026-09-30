export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { planPriceCents, resolvePlan } from "@/lib/billing/plans"
import { createPaymobLink, createStripeSubscriptionLink, createTapLink } from "@/lib/commerce/payments"

export async function POST(request: NextRequest) {
  const session = await requireSessionUser(request)
  if (session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const plan = resolvePlan(String(body.planId || ""))
  const interval = body.interval === "year" ? "year" : "month"
  if (plan.blocked || plan.monthlyUsd <= 0 || plan.id === "creator_free") {
    return NextResponse.json({ error: "Choose a paid plan." }, { status: 400 })
  }
  const provider = body.provider === "paymob" || body.provider === "tap" || body.provider === "vodafone_cash" ? body.provider : "stripe"
  const amountCents = planPriceCents(plan.id, interval)
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const description = `Helixa ${plan.name} (${interval})`
  if (provider === "vodafone_cash") {
    return NextResponse.json({
      provider,
      amountCents,
      currency: "usd",
      instructions: "Transfer the amount with Vodafone Cash and submit the receipt on the billing page. An admin confirms it.",
    })
  }
  const requestBody = {
    amountCents,
    currency: "usd",
    description,
    orderId: session.user.id,
    successUrl: `${origin}/billing?status=success`,
    cancelUrl: `${origin}/billing?status=canceled`,
    customer: { email: session.user.email, name: session.user.email },
  }
  try {
    if (provider === "paymob") {
      const apiKey = process.env.PAYMOB_API_KEY
      const integrationId = process.env.PAYMOB_INTEGRATION_ID
      const iframeId = process.env.PAYMOB_IFRAME_ID
      if (!apiKey || !integrationId || !iframeId) {
        return NextResponse.json({ error: "Paymob is not configured for Helixa billing." }, { status: 503 })
      }
      const link = await createPaymobLink(requestBody, { apiKey, integrationId, iframeId })
      return NextResponse.json({ url: link.url, provider, reference: link.reference, planId: plan.id })
    }
    if (provider === "tap") {
      const secretKey = process.env.TAP_SECRET_KEY
      if (!secretKey) return NextResponse.json({ error: "Tap is not configured." }, { status: 503 })
      const link = await createTapLink(requestBody, { secretKey })
      return NextResponse.json({ url: link.url, provider, reference: link.reference, planId: plan.id })
    }
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 })
    const link = await createStripeSubscriptionLink({
      ...requestBody,
      interval,
      metadata: {
        userId: session.igUser?.id ? String(session.igUser.id) : "",
        accountId: session.user.id,
        planType: "monthly",
        helixaPlan: plan.id,
        interval,
        email: session.user.email || "",
      },
    }, { secretKey })
    return NextResponse.json({ url: link.url, provider: "stripe", reference: link.reference, planId: plan.id, amountCents })
  } catch (error) {
    const { captureException } = await import("@/lib/monitoring")
    await captureException(error, { route: "billing/checkout" })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout failed" }, { status: 502 })
  }
}
