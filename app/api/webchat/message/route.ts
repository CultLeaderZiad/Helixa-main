export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { postWebchatMessage } from "@/lib/webchat/service"
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

/** Visitor message. Runs through the same inbound queue as the other channels. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  let body: { publicKey?: string; visitorId?: string; secret?: string; text?: string; displayName?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: webchatCorsHeaders(origin, false) })
  }
  const supabase = await getSupabaseBypassClient()
  const result = await postWebchatMessage(createSupabaseWebchatGateway(supabase), {
    origin,
    ip: clientIp(request.headers),
  }, {
    publicKey: String(body.publicKey || ""),
    visitorId: body.visitorId,
    secret: body.secret,
    text: body.text,
    displayName: body.displayName,
  })
  return NextResponse.json(result.body, { status: result.status, headers: webchatCorsHeaders(origin, result.cors) })
}
