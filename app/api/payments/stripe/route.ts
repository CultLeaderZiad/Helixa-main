export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { decryptString } from "@/lib/crypto"
import { verifyStripeSignature } from "@/lib/commerce/payments"
import { markOrderFromProvider } from "@/lib/commerce/checkout"

export async function POST(request: NextRequest) {
  const payload = await request.text()
  let event: any
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }
  const orderId = String(event?.data?.object?.client_reference_id || event?.data?.object?.metadata?.order_id || "")
  if (!orderId) return NextResponse.json({ received: true })
  const supabase = await getSupabaseBypassClient()
  const order = await supabase.from("orders").select("id, user_id, workspace_id").eq("id", orderId).maybeSingle()
  const invoice = order.data ? null : await supabase.from("client_invoices").select("id, user_id").eq("id", orderId).maybeSingle()
  const owner = order.data || invoice?.data
  if (!owner) return NextResponse.json({ error: "Unknown order" }, { status: 404 })
  const config = await supabase.from("integration_configs").select("secret_ciphertext, config").eq("user_id", owner.user_id).eq("kind", "stripe").maybeSingle()
  const stored = config.data?.secret_ciphertext ? decryptString(config.data.secret_ciphertext) : null
  const { parseStoredSecret } = await import("@/lib/commerce/checkout")
  const webhookSecret = stored ? parseStoredSecret(stored).webhookSecret || null : null
  if (!webhookSecret || !verifyStripeSignature(webhookSecret, payload, request.headers.get("stripe-signature"), Math.floor(Date.now() / 1000))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }
  const type = String(event.type || "")
  const status = type === "checkout.session.completed" ? "paid" : type === "checkout.session.expired" ? "cancelled" : null
  if (status && order.data) {
    await markOrderFromProvider({
      supabase,
      userId: order.data.user_id,
      workspaceId: order.data.workspace_id,
      orderId: order.data.id,
      status,
      reference: String(event.data?.object?.id || ""),
    })
  } else if (status && invoice?.data) {
    await supabase.from("client_invoices").update({
      status: status === "paid" ? "paid" : "void",
      paid_at: status === "paid" ? new Date().toISOString() : null,
      provider_reference: String(event.data?.object?.id || ""),
    }).eq("id", invoice.data.id)
  }
  return NextResponse.json({ received: true })
}
