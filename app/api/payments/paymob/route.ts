export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { decryptString } from "@/lib/crypto"
import { paymobStatus, verifyPaymobHmac } from "@/lib/commerce/payments"
import { markOrderFromProvider } from "@/lib/commerce/checkout"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  const obj = (body as any).obj || body
  const merchantOrder = String(obj?.order?.merchant_order_id || obj?.merchant_order_id || "")
  if (!merchantOrder) return NextResponse.json({ error: "Missing order" }, { status: 400 })
  const supabase = await getSupabaseBypassClient()
  const order = await supabase.from("orders").select("id, user_id, workspace_id").eq("id", merchantOrder).maybeSingle()
  const invoice = order.data ? null : await supabase.from("client_invoices").select("id, user_id, workspace_id").eq("id", merchantOrder).maybeSingle()
  const owner = order.data || invoice?.data
  if (!owner) return NextResponse.json({ error: "Unknown order" }, { status: 404 })
  const config = await supabase.from("integration_configs").select("secret_ciphertext, config").eq("user_id", owner.user_id).eq("kind", "paymob").maybeSingle()
  const stored = config.data?.secret_ciphertext ? decryptString(config.data.secret_ciphertext) : null
  const { parseStoredSecret } = await import("@/lib/commerce/checkout")
  const parsed = stored ? parseStoredSecret(stored) : {}
  const secret = parsed.hmac || null
  const hmac = request.nextUrl.searchParams.get("hmac") || String((body as any).hmac || "")
  if (!secret || !verifyPaymobHmac(body as Record<string, unknown>, secret, hmac)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }
  const status = paymobStatus(body as Record<string, unknown>)
  if (order.data) {
    await markOrderFromProvider({
      supabase,
      userId: order.data.user_id,
      workspaceId: order.data.workspace_id,
      orderId: order.data.id,
      status,
      reference: String(obj.id || ""),
    })
  } else if (invoice?.data) {
    await supabase.from("client_invoices").update({
      status: status === "paid" ? "paid" : status === "pending_payment" ? "open" : "void",
      paid_at: status === "paid" ? new Date().toISOString() : null,
      provider_reference: String(obj.id || ""),
    }).eq("id", invoice.data.id)
  }
  return NextResponse.json({ ok: true })
}
