// Stored payment intents. A checkout records the provider's own order/charge id
// together with the amount and currency it was created for. The Paymob and Tap
// callbacks then bind to that row by the signed provider id — never by body
// metadata — and compare amount/currency before granting anything.
import type { Db } from "@/lib/channels/types"

export type PaymentProvider = "paymob" | "tap" | "stripe"

export interface PaymentIntentRow {
  id: string
  account_id: string
  order_id: string | null
  invoice_id: string | null
  provider: PaymentProvider
  provider_order_id: string
  amount_minor: number
  currency: string
  status: string
}

function missing(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message || ""
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    /schema cache|does not exist|Could not find the table/i.test(message)
  )
}

export async function recordPaymentIntent(
  supabase: Db,
  input: {
    accountId: string | null | undefined
    orderId?: string | null
    invoiceId?: string | null
    provider: PaymentProvider
    providerOrderId: string | null | undefined
    amountMinor: number
    currency: string
  },
): Promise<boolean> {
  if (!input.accountId || !input.providerOrderId) return false
  const saved = await supabase.from("payment_intents").upsert(
    {
      account_id: input.accountId,
      order_id: input.orderId ?? null,
      invoice_id: input.invoiceId ?? null,
      provider: input.provider,
      provider_order_id: String(input.providerOrderId),
      amount_minor: Math.round(input.amountMinor),
      currency: String(input.currency || "usd").toUpperCase(),
      status: "pending",
    },
    { onConflict: "provider,provider_order_id", ignoreDuplicates: true },
  )
  if (saved.error) {
    if (missing(saved.error)) return false
    console.warn("[payment_intents] upsert failed:", saved.error.message)
    return false
  }
  return true
}

export async function loadPaymentIntent(
  supabase: Db,
  provider: PaymentProvider,
  providerOrderId: string,
): Promise<PaymentIntentRow | null> {
  const found = await supabase
    .from("payment_intents")
    .select("*")
    .eq("provider", provider)
    .eq("provider_order_id", String(providerOrderId))
    .maybeSingle()
  if (found.error) {
    if (missing(found.error)) return null
    console.warn("[payment_intents] lookup failed:", found.error.message)
    return null
  }
  return (found.data as PaymentIntentRow) || null
}

/**
 * Atomically move an intent from 'pending' to 'paid'. Returns the updated row
 * when this request won the race, or null when it was already applied (replay).
 */
export async function markIntentPaid(
  supabase: Db,
  intentId: string,
): Promise<PaymentIntentRow | null> {
  const updated = await supabase
    .from("payment_intents")
    .update({ status: "paid" })
    .eq("id", intentId)
    .eq("status", "pending")
    .select("*")
  if (updated.error) throw updated.error
  const rows = Array.isArray(updated.data) ? (updated.data as PaymentIntentRow[]) : []
  return rows[0] || null
}

export async function markIntentStatus(
  supabase: Db,
  intentId: string,
  status: "failed" | "cancelled",
): Promise<void> {
  const updated = await supabase
    .from("payment_intents")
    .update({ status })
    .eq("id", intentId)
    .eq("status", "pending")
  if (updated.error && !missing(updated.error)) console.warn("[payment_intents] status update failed:", updated.error.message)
}

/**
 * Idempotent receipt write. unique(provider, transaction_id) makes replays a
 * no-op rather than a duplicate.
 */
export async function recordPaymentReceipt(
  supabase: Db,
  input: {
    provider: PaymentProvider
    providerOrderId: string
    transactionId: string
    accountId: string
    amountMinor: number
    currency: string
    status: string
  },
): Promise<void> {
  const saved = await supabase.from("payment_receipts").upsert(
    {
      provider: input.provider,
      provider_order_id: String(input.providerOrderId),
      transaction_id: String(input.transactionId),
      account_id: input.accountId,
      amount_minor: Math.round(input.amountMinor),
      currency: input.currency.toUpperCase(),
      status: input.status,
    },
    { onConflict: "provider,transaction_id", ignoreDuplicates: true },
  )
  if (saved.error && !missing(saved.error)) console.warn("[payment_receipts] upsert failed:", saved.error.message)
}
