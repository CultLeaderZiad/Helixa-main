export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { decryptString } from "@/lib/crypto"
import { verifyTapHash } from "@/lib/commerce/payments"
import { markOrderFromProvider, parseStoredSecret } from "@/lib/commerce/checkout"

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  const charge = body as Record<string, any>
  const orderId = String(charge?.metadata?.orderId || charge?.reference?.order || "")
  if (!orderId) return NextResponse.json({ error: "Missing order" }, { status: 400 })
  const supabase = await getSupabaseBypassClient()
  const order = await supabase.from("orders").select("id, user_id, workspace_id").eq("id", orderId).maybeSingle()
  const invoice = order.data ? null : await supabase.from("client_invoices").select("id, user_id, workspace_id").eq("id", orderId).maybeSingle()
  const owner = order.data || invoice?.data
  if (!owner?.user_id) return NextResponse.json({ error: "Unknown order" }, { status: 404 })
  const config = await supabase.from("integration_configs").select("secret_ciphertext").eq("user_id", owner.user_id).eq("kind", "tap").maybeSingle()
  const stored = config.data?.secret_ciphertext ? decryptString(config.data.secret_ciphertext) : null
  const secret = stored ? parseStoredSecret(stored).secretKey || null : process.env.TAP_SECRET_KEY || null
  const hash = request.headers.get("hashstring")
  if (!secret || !verifyTapHash(charge, secret, hash)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  const paid = String(charge.status || "").toUpperCase() === "CAPTURED"
  if (order.data) {
    await markOrderFromProvider({
      supabase,
      userId: order.data.user_id,
      workspaceId: order.data.workspace_id,
      orderId: order.data.id,
      status: paid ? "paid" : "cancelled",
      reference: String(charge.id || ""),
    })
  } else if (invoice?.data) {
    await supabase.from("client_invoices").update({
      status: paid ? "paid" : "void",
      paid_at: paid ? new Date().toISOString() : null,
      provider_reference: String(charge.id || ""),
    }).eq("id", invoice.data.id)
  }
  return NextResponse.json({ ok: true })
}
