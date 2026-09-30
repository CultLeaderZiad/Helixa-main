export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { createSupabaseWebchatGateway } from "@/lib/webchat/supabase-gateway"
import { openWebchatSession } from "@/lib/webchat/service"
import { clientIp, originAllowed, webchatCorsHeaders } from "@/lib/webchat/security"

async function preflight(request: NextRequest) {
  const origin = request.headers.get("origin")
  const key = request.nextUrl.searchParams.get("key") || ""
  const supabase = await getSupabaseBypassClient()
  const widget = key ? await createSupabaseWebchatGateway(supabase).widgetByKey(key) : null
  const allowed = Boolean(widget && originAllowed(origin, widget.allowed_domains))
  return new NextResponse(null, { status: 204, headers: webchatCorsHeaders(origin, allowed) })
}

function respond(origin: string | null, result: { status: number; body: Record<string, unknown>; cors: boolean }) {
  return NextResponse.json(result.body, { status: result.status, headers: webchatCorsHeaders(origin, result.cors) })
}

export async function OPTIONS(request: NextRequest) {
  return preflight(request)
}

/** Issues or resumes a visitor. The secret is returned once and stored by the browser. */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin")
  let body: { publicKey?: string; visitorId?: string; secret?: string; displayName?: string } = {}
  try {
    body = await request.json()
  } catch {
    return respond(origin, { status: 400, body: { error: "Invalid JSON body" }, cors: false })
  }
  const supabase = await getSupabaseBypassClient()
  const result = await openWebchatSession(createSupabaseWebchatGateway(supabase), {
    origin,
    ip: clientIp(request.headers),
  }, {
    publicKey: String(body.publicKey || ""),
    visitorId: body.visitorId,
    secret: body.secret,
    displayName: body.displayName,
  })
  return respond(origin, result)
}
