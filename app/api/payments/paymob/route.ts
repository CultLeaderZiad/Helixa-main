export const dynamic = "force-dynamic"

// Paymob transaction callback.
//
// Hardening: after verifying the HMAC we bind to the stored payment_intent using
// the signed Paymob order id (`obj.order.id`), never the body's merchant_order_id.
// The intent's amount and currency must match, the status transitions once via a
// compare-and-set from 'pending', and a receipt is logged by transaction id.
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { decryptString } from "@/lib/crypto"
import { paymobStatus, verifyPaymobHmac } from "@/lib/commerce/payments"
import { markOrderFromProvider, parseStoredSecret } from "@/lib/commerce/checkout"
import { loadPaymentIntent, markIntentPaid, markIntentStatus, recordPaymentReceipt } from "@/lib/commerce/intents"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

  const obj = (body as any).obj && typeof (body as any).obj === "object" ? (body as any).obj : (body as any)
  const merchantOrder = String(obj?.order?.merchant_order_id || obj?.merchant_order_id || "")
  if (!merchantOrder) return NextResponse.json({ error: "Missing order" }, { status: 400 })

  const supabase = await getSupabaseBypassClient()

  // Locate the merchant only to fetch the per-tenant HMAC secret. Nothing is
  // trusted until the signature below verifies.
  const order = await supabase.from("orders").select("id, user_id, workspace_id").eq("id", merchantOrder).maybeSingle()
  const invoice = order.data
    ? { data: null }
    : await supabase.from("client_invoices").select("id, user_id, workspace_id").eq("id", merchantOrder).maybeSingle()
  const owner = order.data || invoice.data
  if (!owner) return NextResponse.json({ error: "Unknown order" }, { status: 404 })

  const config = await supabase
    .from("integration_configs")
    .select("secret_ciphertext")
    .eq("user_id", owner.user_id)
    .eq("kind", "paymob")
    .maybeSingle()
  const stored = config.data?.secret_ciphertext ? decryptString(config.data.secret_ciphertext) : null
  const parsed = stored ? parseStoredSecret(stored) : {}
  const secret = parsed.hmac || null
  const hmac = request.nextUrl.searchParams.get("hmac") || String((body as any).hmac || "")
  if (!secret || !verifyPaymobHmac(body as Record<string, unknown>, secret, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const providerOrderId = String(obj?.order?.id || "")
  const transactionId = String(obj?.id || "")
  const intent = providerOrderId ? await loadPaymentIntent(supabase, "paymob", providerOrderId) : null
  if (!intent) return NextResponse.json({ error: "Unknown payment intent" }, { status: 404 })

  // The signed id must map back to the same order/invoice we were told about.
  if (intent.order_id !== merchantOrder && intent.invoice_id !== merchantOrder) {
    return NextResponse.json({ error: "Payment intent mismatch" }, { status: 400 })
  }

  const status = paymobStatus(body as Record<string, unknown>)

  if (status === "pending_payment") {
    // Still pending at the provider. Leave the intent open so the capture can win.
    return NextResponse.json({ ok: true, pending: true })
  }

  if (status !== "paid") {
    // A terminal non-capture: record it and never grant the plan.
    await markIntentStatus(supabase, intent.id, "cancelled")
    if (order.data) {
      await markOrderFromProvider({
        supabase,
        userId: order.data.user_id,
        workspaceId: order.data.workspace_id,
        orderId: order.data.id,
        status: "cancelled",
        reference: transactionId,
      })
    } else if (invoice.data) {
      await supabase
        .from("client_invoices")
        .update({ status: "void", provider_reference: transactionId })
        .eq("id", invoice.data.id)
    }
    return NextResponse.json({ ok: true })
  }

  const amountMinor = Number(obj?.amount_cents)
  const currency = String(obj?.currency || "").toUpperCase()
  if (Number(intent.amount_minor) !== amountMinor || String(intent.currency).toUpperCase() !== currency) {
    return NextResponse.json({ error: "Amount or currency mismatch" }, { status: 400 })
  }

  // Compare-and-set pending -> paid. A replay returns the already-paid path.
  const won = await markIntentPaid(supabase, intent.id)
  if (!won) return NextResponse.json({ ok: true, replay: true })

  await recordPaymentReceipt(supabase, {
    provider: "paymob",
    providerOrderId,
    transactionId,
    accountId: intent.account_id,
    amountMinor,
    currency,
    status: "paid",
  })

  if (order.data) {
    await markOrderFromProvider({
      supabase,
      userId: order.data.user_id,
      workspaceId: order.data.workspace_id,
      orderId: order.data.id,
      status: "paid",
      reference: transactionId,
    })
  } else if (invoice.data) {
    await supabase
      .from("client_invoices")
      .update({ status: "paid", paid_at: new Date().toISOString(), provider_reference: transactionId })
      .eq("id", invoice.data.id)
  }

  return NextResponse.json({ ok: true })
}
