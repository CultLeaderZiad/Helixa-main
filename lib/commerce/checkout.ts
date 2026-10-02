import { buildOrderDraft } from "@/lib/commerce/orders"
import { createPaymentLink, type PaymentProviderId } from "@/lib/commerce/payments"
import { recordPaymentIntent } from "@/lib/commerce/intents"
import type { Db } from "@/lib/channels/types"
import { decryptString } from "@/lib/crypto"

function missing(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message || ""
  return error?.code === "42P01" || error?.code === "PGRST205" || /schema cache|does not exist|Could not find the table/i.test(message)
}

export async function placeOrder(input: {
  supabase: Db
  userId: string | number
  workspaceId?: string | null
  contactExternalId?: string | null
  channel?: string | null
  productIds: string[]
  fetchImpl?: typeof fetch
}): Promise<{ orderId: string; paymentLink: string | null; status: string } | null> {
  if (input.productIds.length === 0) return null
  const loaded = await input.supabase.from("products").select("id, name, price_cents, currency").eq("user_id", input.userId).in("id", input.productIds)
  if (loaded.error || !Array.isArray(loaded.data) || loaded.data.length === 0) return null
  const draft = buildOrderDraft(
    loaded.data.map((row: any) => ({
      id: String(row.id),
      name: String(row.name),
      priceCents: Number(row.price_cents || 0),
      currency: String(row.currency || "EGP"),
    })),
  )
  const created = await input.supabase
    .from("orders")
    .insert({
      workspace_id: input.workspaceId || null,
      user_id: input.userId,
      contact_external_id: input.contactExternalId || null,
      channel: input.channel || null,
      status: "pending_payment",
      currency: draft.currency,
      total_cents: draft.totalCents,
      items: draft.items,
    })
    .select("id")
    .maybeSingle()
  if (created.error || !created.data?.id) {
    if (created.error && !missing(created.error)) console.warn("[orders] insert failed:", created.error.message)
    return null
  }
  const orderId = String(created.data.id)
  let paymentLink: string | null = null
  let provider: string | null = null
  let reference: string | null = null
  try {
    const link = await linkForOrder(input.supabase, input.userId, {
      amountCents: draft.totalCents,
      currency: draft.currency,
      description: draft.items.map((item) => item.name).join(", ").slice(0, 120) || "Order",
      orderId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://helixa.local"}/dashboard/catalog?paid=${orderId}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://helixa.local"}/dashboard/catalog?cancelled=${orderId}`,
    }, input.fetchImpl)
    if (link) {
      paymentLink = link.url
      provider = link.provider
      reference = link.reference
      await input.supabase.from("orders").update({ payment_link: link.url, payment_provider: link.provider, payment_ref: link.reference }).eq("id", orderId)
      // Bind the provider's signed order/charge id to this order so the callback
      // can trust the stored intent instead of body metadata.
      const profile = await input.supabase.from("users").select("account_id").eq("id", input.userId).maybeSingle()
      await recordPaymentIntent(input.supabase, {
        accountId: profile.data?.account_id ?? null,
        orderId,
        provider: link.provider,
        providerOrderId: link.reference,
        amountMinor: draft.totalCents,
        currency: draft.currency,
      })
    }
  } catch (error) {
    console.warn("[orders] payment link failed:", error)
  }
  const { emitIntegrationEvent } = await import("@/lib/integrations/dispatch")
  await emitIntegrationEvent(input.supabase, {
    workspaceId: input.workspaceId || null,
    userId: input.userId,
    type: "order.created",
    data: { orderId, totalCents: draft.totalCents, currency: draft.currency, paymentLink, provider, reference },
  })
  return { orderId, paymentLink, status: "pending_payment" }
}

async function linkForOrder(
  supabase: Db,
  userId: string | number,
  request: { amountCents: number; currency: string; description: string; orderId: string; successUrl: string; cancelUrl: string },
  fetchImpl?: typeof fetch,
) {
  return paymentLinkForUser(supabase, userId, request, fetchImpl)
}

export async function paymentLinkForUser(
  supabase: Db,
  userId: string | number,
  request: { amountCents: number; currency: string; description: string; orderId: string; successUrl: string; cancelUrl: string; customer?: { name?: string; email?: string; phone?: string } },
  fetchImpl?: typeof fetch,
  preferred?: PaymentProviderId | null,
) {
  const configs = await supabase.from("integration_configs").select("kind, config, secret_ciphertext").eq("user_id", userId).in("kind", ["paymob", "stripe", "tap"])
  if (configs.error || !Array.isArray(configs.data)) return null
  const byKind = new Map<string, { config?: { integration_id?: string; iframe_id?: string }; secret_ciphertext?: string }>()
  for (const row of configs.data as Array<{ kind?: string; config?: { integration_id?: string; iframe_id?: string }; secret_ciphertext?: string }>) {
    if (row?.kind) byKind.set(row.kind, row)
  }
  const order: PaymentProviderId[] = preferred ? [preferred, "paymob", "stripe", "tap"] : ["paymob", "stripe", "tap"]
  const provider = order.find((kind) => byKind.get(kind)?.secret_ciphertext) || null
  if (!provider) return null
  const row = byKind.get(provider)
  if (!row) return null
  const secret = decryptString(String(row.secret_ciphertext || ""))
  if (!secret) return null
  const parsed = parseStoredSecret(secret)
  const secrets =
    provider === "paymob"
      ? { paymob: { apiKey: parsed.apiKey || secret, integrationId: String(row.config?.integration_id || ""), iframeId: String(row.config?.iframe_id || "") } }
      : provider === "tap"
        ? { tap: { secretKey: parsed.secretKey || secret } }
        : { stripe: { secretKey: parsed.secretKey || secret } }
  return createPaymentLink(provider, request, secrets, fetchImpl)
}

export function parseStoredSecret(secret: string): { apiKey?: string; hmac?: string; secretKey?: string; webhookSecret?: string } {
  try {
    const parsed = JSON.parse(secret)
    if (parsed && typeof parsed === "object") return parsed
  } catch {
    // Older rows stored the API key as plain text.
  }
  return { apiKey: secret, secretKey: secret }
}

export async function markOrderFromProvider(input: {
  supabase: Db
  userId: string | number
  workspaceId?: string | null
  orderId: string
  status: "paid" | "cancelled" | "pending_payment"
  reference?: string | null
}): Promise<boolean> {
  const existing = await input.supabase.from("orders").select("id, status, contact_external_id, channel, user_id, workspace_id").eq("id", input.orderId).eq("user_id", input.userId).maybeSingle()
  if (!existing.data) return false
  const { applyOrderStatus } = await import("@/lib/commerce/orders")
  const next = applyOrderStatus(existing.data.status, input.status)
  if (!next.changed) return false
  await input.supabase.from("orders").update({ status: next.status, payment_ref: input.reference || existing.data.payment_ref, updated_at: new Date().toISOString() }).eq("id", input.orderId)
  const { emitIntegrationEvent } = await import("@/lib/integrations/dispatch")
  await emitIntegrationEvent(input.supabase, {
    workspaceId: input.workspaceId || existing.data.workspace_id || null,
    userId: input.userId,
    type: "order.updated",
    data: { orderId: input.orderId, status: next.status },
  })
  if (existing.data.contact_external_id && existing.data.channel) {
    const { enqueueOrderFlowStarts } = await import("@/lib/flows/runtime")
    await enqueueOrderFlowStarts(input.supabase, { userId: input.userId, workspaceId: existing.data.workspace_id }, {
      id: input.orderId,
      status: next.status,
      contactExternalId: existing.data.contact_external_id,
      channel: existing.data.channel,
    })
  }
  return true
}
