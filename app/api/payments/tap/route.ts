export const dynamic = "force-dynamic"

// Tap charge callback.
//
// Hardening: after verifying the hash we bind to the stored payment_intent using
// the signed charge id, never body metadata. The intent's amount and currency
// must match, the status transitions once via a compare-and-set from 'pending',
// and a receipt is logged by transaction id.
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { decryptString } from "@/lib/crypto"
import { verifyTapHash } from "@/lib/commerce/payments"
import { markOrderFromProvider, parseStoredSecret } from "@/lib/commerce/checkout"
import { loadPaymentIntent, markIntentPaid, markIntentStatus, recordPaymentReceipt } from "@/lib/commerce/intents"
import { minorUnits } from "@/lib/money"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

  const charge = body as Record<string, any>
  const orderId = String(charge?.metadata?.orderId || charge?.reference?.order || "")
  if (!orderId) return NextResponse.json({ error: "Missing order" }, { status: 400 })

  const supabase = await getSupabaseBypassClient()

  const order = await supabase.from("orders").select("id, user_id, workspace_id").eq("id", orderId).maybeSingle()
  const invoice = order.data
    ? { data: null }
    : await supabase.from("client_invoices").select("id, user_id, workspace_id").eq("id", orderId).maybeSingle()
  const owner = order.data || invoice.data
  if (!owner?.user_id) return NextResponse.json({ error: "Unknown order" }, { status: 404 })

  const config = await supabase
    .from("integration_configs")
    .select("secret_ciphertext")
    .eq("user_id", owner.user_id)
    .eq("kind", "tap")
    .maybeSingle()
  const stored = config.data?.secret_ciphertext ? decryptString(config.data.secret_ciphertext) : null
  const secret = stored ? parseStoredSecret(stored).secretKey || null : process.env.TAP_SECRET_KEY || null
  const hash = request.headers.get("hashstring")
  if (!secret || !verifyTapHash(charge, secret, hash)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const providerOrderId = String(charge.id || "")
  const intent = providerOrderId ? await loadPaymentIntent(supabase, "tap", providerOrderId) : null
  if (!intent) return NextResponse.json({ error: "Unknown payment intent" }, { status: 404 })

  if (intent.order_id !== orderId && intent.invoice_id !== orderId) {
    return NextResponse.json({ error: "Payment intent mismatch" }, { status: 400 })
  }

  const chargeStatus = String(charge.status || "").toUpperCase()
  const paid = chargeStatus === "CAPTURED"
  if (!paid) {
    // Leave the intent open until a terminal status arrives.
    if (!["CANCELLED", "FAILED", "DECLINED"].includes(chargeStatus)) {
      return NextResponse.json({ ok: true, pending: true })
    }
    await markIntentStatus(supabase, intent.id, chargeStatus === "CANCELLED" ? "cancelled" : "failed")
    if (order.data && chargeStatus === "CANCELLED") {
      await markOrderFromProvider({
        supabase,
        userId: order.data.user_id,
        workspaceId: order.data.workspace_id,
        orderId: order.data.id,
        status: "cancelled",
        reference: providerOrderId,
      })
    }
    return NextResponse.json({ ok: true })
  }

  const currency = String(charge.currency || intent.currency).toUpperCase()
  const digits = minorUnits(currency)
  const amountMinor = Math.round(Number(charge.amount) * 10 ** digits)
  if (Number(intent.amount_minor) !== amountMinor || String(intent.currency).toUpperCase() !== currency) {
    return NextResponse.json({ error: "Amount or currency mismatch" }, { status: 400 })
  }

  const won = await markIntentPaid(supabase, intent.id)
  if (!won) return NextResponse.json({ ok: true, replay: true })

  await recordPaymentReceipt(supabase, {
    provider: "tap",
    providerOrderId,
    transactionId: providerOrderId,
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
      reference: providerOrderId,
    })
  } else if (invoice.data) {
    await supabase
      .from("client_invoices")
      .update({ status: "paid", paid_at: new Date().toISOString(), provider_reference: providerOrderId })
      .eq("id", invoice.data.id)
  }

  return NextResponse.json({ ok: true })
}
