import { createHmac, timingSafeEqual } from "crypto"
import type { FetchLike } from "@/lib/channels/types"

export type PaymentProviderId = "paymob" | "stripe"

export interface PaymentLinkRequest {
  amountCents: number
  currency: string
  description: string
  orderId: string
  customer?: { name?: string; email?: string; phone?: string }
  successUrl: string
  cancelUrl: string
}

export interface PaymentLink {
  url: string
  provider: PaymentProviderId
  reference: string
}

export interface PaymobConfig {
  apiKey: string
  integrationId: string
  iframeId: string
  baseUrl?: string
}

export interface StripeConfig {
  secretKey: string
}

const PAYMOB_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order",
  "owner",
  "pending",
  "source_data_pan",
  "source_data_sub_type",
  "source_data_type",
  "success",
] as const

function boolText(value: unknown): string {
  if (value === true || value === "true") return "true"
  if (value === false || value === "false") return "false"
  return String(value ?? "")
}

/** Paymob's transaction callback string, in their documented field order. */
export function paymobHmacString(body: Record<string, unknown>): string {
  const obj = body.obj && typeof body.obj === "object" ? (body.obj as Record<string, unknown>) : body
  const source = (obj.source_data || {}) as Record<string, unknown>
  const order = obj.order && typeof obj.order === "object" ? (obj.order as { id?: unknown }).id : obj.order
  const values: Record<string, unknown> = {
    ...obj,
    order,
    source_data_pan: source.pan,
    source_data_sub_type: source.sub_type,
    source_data_type: source.type,
  }
  return PAYMOB_FIELDS.map((field) => {
    const value = values[field]
    if (typeof value === "boolean") return boolText(value)
    return value == null ? "" : String(value)
  }).join("")
}

export function signPaymob(body: Record<string, unknown>, secret: string): string {
  return createHmac("sha512", secret).update(paymobHmacString(body)).digest("hex")
}

export function verifyPaymobHmac(body: Record<string, unknown>, secret: string, hmac: string | null | undefined): boolean {
  if (!hmac || !secret) return false
  const expected = signPaymob(body, secret)
  const left = Buffer.from(expected)
  const right = Buffer.from(String(hmac))
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function paymobStatus(body: Record<string, unknown>): "paid" | "cancelled" | "pending_payment" {
  const obj = body.obj && typeof body.obj === "object" ? (body.obj as Record<string, unknown>) : body
  if (obj.success === true || obj.success === "true") return "paid"
  if (obj.pending === true || obj.pending === "true") return "pending_payment"
  return "cancelled"
}

async function readJson(response: Response): Promise<any> {
  return response.json().catch(() => null)
}

export async function createPaymobLink(input: PaymentLinkRequest, config: PaymobConfig, fetchImpl: FetchLike = fetch): Promise<PaymentLink> {
  const base = (config.baseUrl || "https://accept.paymob.com").replace(/\/$/, "")
  const auth = await fetchImpl(`${base}/api/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: config.apiKey }),
  })
  const authJson = await readJson(auth as Response)
  if (!auth.ok || !authJson?.token) throw new Error(authJson?.message || "Paymob auth failed")
  const order = await fetchImpl(`${base}/api/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authJson.token,
      delivery_needed: false,
      amount_cents: input.amountCents,
      currency: input.currency,
      merchant_order_id: input.orderId,
      items: [],
    }),
  })
  const orderJson = await readJson(order as Response)
  if (!order.ok || !orderJson?.id) throw new Error("Paymob order registration failed")
  const name = (input.customer?.name || "Customer").split(" ")
  const key = await fetchImpl(`${base}/api/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authJson.token,
      amount_cents: input.amountCents,
      expiration: 3600,
      order_id: orderJson.id,
      billing_data: {
        apartment: "NA",
        email: input.customer?.email || "customer@example.com",
        floor: "NA",
        first_name: name[0] || "Customer",
        street: "NA",
        building: "NA",
        phone_number: input.customer?.phone || "+201000000000",
        shipping_method: "PKG",
        postal_code: "NA",
        city: "NA",
        country: "EG",
        last_name: name.slice(1).join(" ") || "NA",
        state: "NA",
      },
      currency: input.currency,
      integration_id: Number(config.integrationId),
    }),
  })
  const keyJson = await readJson(key as Response)
  if (!key.ok || !keyJson?.token) throw new Error("Paymob payment key failed")
  return {
    provider: "paymob",
    reference: String(orderJson.id),
    url: `${base}/api/acceptance/iframes/${config.iframeId}?payment_token=${encodeURIComponent(keyJson.token)}`,
  }
}

export function stripeSignature(secret: string, payload: string, timestamp: number): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")
  return `t=${timestamp},v1=${digest}`
}

export function verifyStripeSignature(secret: string, payload: string, header: string | null, nowSec: number, tolerance = 300): boolean {
  if (!header) return false
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=") as [string, string]))
  const timestamp = Number(parts.t)
  if (!Number.isFinite(timestamp) || Math.abs(nowSec - timestamp) > tolerance) return false
  const expected = stripeSignature(secret, payload, timestamp)
  const left = Buffer.from(expected)
  const right = Buffer.from(header)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export async function createStripeLink(input: PaymentLinkRequest, config: StripeConfig, fetchImpl: FetchLike = fetch): Promise<PaymentLink> {
  const body = new URLSearchParams()
  body.set("mode", "payment")
  body.set("success_url", input.successUrl)
  body.set("cancel_url", input.cancelUrl)
  body.set("client_reference_id", input.orderId)
  body.set("line_items[0][quantity]", "1")
  body.set("line_items[0][price_data][currency]", input.currency.toLowerCase())
  body.set("line_items[0][price_data][unit_amount]", String(input.amountCents))
  body.set("line_items[0][price_data][product_data][name]", input.description.slice(0, 120) || "Order")
  const response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  const json = await readJson(response as Response)
  if (!response.ok || !json?.url) throw new Error(json?.error?.message || "Stripe checkout failed")
  return { provider: "stripe", reference: String(json.id), url: String(json.url) }
}

export async function createPaymentLink(
  provider: PaymentProviderId,
  input: PaymentLinkRequest,
  secrets: { paymob?: PaymobConfig; stripe?: StripeConfig },
  fetchImpl: FetchLike = fetch,
): Promise<PaymentLink> {
  if (provider === "paymob") {
    if (!secrets.paymob) throw new Error("Paymob is not configured")
    return createPaymobLink(input, secrets.paymob, fetchImpl)
  }
  if (!secrets.stripe) throw new Error("Stripe is not configured")
  return createStripeLink(input, secrets.stripe, fetchImpl)
}
