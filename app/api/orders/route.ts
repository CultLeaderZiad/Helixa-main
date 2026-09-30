export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { workspaceSession, isMissingTable } from "@/lib/flows/session"
import { placeOrder } from "@/lib/commerce/checkout"

export async function GET(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const { data, error } = await session.supabase.from("orders").select("*").eq("user_id", session.userId).order("created_at", { ascending: false }).limit(100)
  if (error) {
    if (isMissingTable(error)) return NextResponse.json({ orders: [], migration_required: true })
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 })
  }
  return NextResponse.json({ orders: data || [] })
}

export async function POST(request: NextRequest) {
  const session = await workspaceSession(request)
  if ("response" in session && session.response) return session.response
  const body = await request.json().catch(() => ({}))
  const productIds = Array.isArray(body.productIds) ? body.productIds.map((id: unknown) => String(id)) : []
  const placed = await placeOrder({
    supabase: session.supabase,
    userId: session.userId,
    workspaceId: session.workspaceId,
    contactExternalId: body.contactExternalId || null,
    channel: body.channel || null,
    productIds,
  })
  if (!placed) return NextResponse.json({ error: "Could not create the order" }, { status: 400 })
  return NextResponse.json(placed)
}
