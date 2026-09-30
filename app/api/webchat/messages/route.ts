export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { listWebchatMessages } from "@/lib/webchat/service"
import { createSupabaseWebchatGateway } from "@/lib/webchat/supabase-gateway"
import { clientIp, originAllowed, webchatCorsHeaders } from "@/lib/webchat/security"

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  const key = request.nextUrl.searchParams.get("key") || ""
  const supabase = await getSupabaseBypassClient()
  const widget = key ? await createSupabaseWebchatGateway(supabase).widgetByKey(key) : null
  const allowed = Boolean(widget && originAllowed(origin, widget.allowed_domains))
  return new NextResponse(null, { status: 204, headers: webchatCorsHeaders(origin, allowed) })
}

/**
 * Poll for this visitor only. The widget does not open a Supabase Realtime
 * channel, because an anon policy on messages could leak other visitors.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  let body: { publicKey?: string; visitorId?: string; secret?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: webchatCorsHeaders(origin, false) })
  }
  const supabase = await getSupabaseBypassClient()
  const result = await listWebchatMessages(createSupabaseWebchatGateway(supabase), {
    origin,
    ip: clientIp(request.headers),
  }, {
    publicKey: String(body.publicKey || ""),
    visitorId: body.visitorId,
    secret: body.secret,
  })
  return NextResponse.json(result.body, { status: result.status, headers: webchatCorsHeaders(origin, result.cors) })
}
