export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { forbidBelow, requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { ensureTenantProfile } from "@/lib/tenant-user"
import { newWidgetKey, widgetSnippet } from "@/lib/webchat/security"

function originOf(request: NextRequest): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
  if (configured) return configured
  return request.nextUrl.origin
}

function cleanDomains(value: unknown): string[] {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : []
  const domains: string[] = []
  for (const item of source) {
    const host = String(item || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    if (!host || host.length > 253) continue
    if (!/^\*\.?[a-z0-9.-]+$/.test(host) && !/^[a-z0-9.-]+$/.test(host)) continue
    domains.push(host)
    if (domains.length >= 20) break
  }
  return domains
}

function cleanColor(value: unknown): string {
  const color = String(value || "").trim()
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color) ? color : "#111111"
}

function publicWidget(row: any, request: NextRequest) {
  return {
    id: row.id,
    public_key: row.public_key,
    name: row.name,
    greeting: row.greeting,
    color: row.color,
    locale: row.locale,
    allowed_domains: row.allowed_domains || [],
    enabled: row.enabled !== false,
    snippet: widgetSnippet(originOf(request), row.public_key),
  }
}

export async function GET(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  if (!result.igUser?.id) return NextResponse.json({ widgets: [] })
  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase
    .from("webchat_widgets")
    .select("id, public_key, name, greeting, color, locale, allowed_domains, enabled")
    .eq("user_id", result.igUser.id)
    .order("created_at", { ascending: false })
  if (error) {
    if (/webchat_widgets/i.test(error.message || "")) {
      return NextResponse.json({ error: "Run the phase 4 migration before creating a website chat.", widgets: [] }, { status: 503 })
    }
    return NextResponse.json({ error: "Could not load widgets" }, { status: 500 })
  }
  return NextResponse.json({ widgets: (data || []).map((row: any) => publicWidget(row, request)) })
}

export async function POST(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  const denied = forbidBelow(result.user.workspace_role, "admin")
  if (denied) return denied
  let body: { name?: string; greeting?: string; color?: string; locale?: string; allowed_domains?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const supabase = await getSupabaseBypassClient()
  let profile = result.igUser
  if (!profile?.id) {
    try {
      profile = await ensureTenantProfile(supabase, result.user, "workspace_managed", result.workspace?.id)
    } catch (error) {
      console.error("[webchat] profile:", error)
      return NextResponse.json({ error: "Could not prepare a workspace profile" }, { status: 500 })
    }
  }

  const publicKey = newWidgetKey()
  const row = {
    user_id: profile.id,
    workspace_id: result.workspace?.id || profile.workspace_id || null,
    public_key: publicKey,
    name: String(body.name || "Chat").slice(0, 80),
    greeting: body.greeting ? String(body.greeting).slice(0, 500) : null,
    color: cleanColor(body.color),
    locale: body.locale === "ar" ? "ar" : "en",
    allowed_domains: cleanDomains(body.allowed_domains),
    enabled: true,
  }
  const inserted = await supabase.from("webchat_widgets").insert(row).select("id, public_key, name, greeting, color, locale, allowed_domains, enabled").maybeSingle()
  if (inserted.error || !inserted.data) {
    if (/webchat_widgets/i.test(inserted.error?.message || "")) {
      return NextResponse.json({ error: "Run the phase 4 migration before creating a website chat." }, { status: 503 })
    }
    console.error("[webchat] insert:", inserted.error)
    return NextResponse.json({ error: "Could not create the widget" }, { status: 500 })
  }

  const connection = {
    user_id: profile.id,
    account_id: result.user.id,
    platform: "webchat",
    page_id: publicKey,
    external_account_id: publicKey,
    access_token: "webchat_managed",
    metadata: {
      name: row.name,
      greeting: row.greeting,
      color: row.color,
      locale: row.locale,
      allowed_domains: row.allowed_domains,
    },
    workspace_id: row.workspace_id,
  }
  const saved = await supabase.from("platform_connections").insert(connection)
  if (saved.error && /workspace_id|account_id|external_account_id/i.test(saved.error.message || "")) {
    delete (connection as any).workspace_id
    delete (connection as any).account_id
    delete (connection as any).external_account_id
    await supabase.from("platform_connections").insert(connection)
  }
  return NextResponse.json({ widget: publicWidget(inserted.data, request) })
}

export async function PATCH(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return result.response
  const denied = forbidBelow(result.user.workspace_role, "admin")
  if (denied) return denied
  let body: { id?: string; name?: string; greeting?: string; color?: string; locale?: string; allowed_domains?: unknown; enabled?: boolean } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 })
  if (!result.igUser?.id) return NextResponse.json({ error: "Widget not found" }, { status: 404 })
  const supabase = await getSupabaseBypassClient()
  const patch: Record<string, unknown> = {}
  if (body.name != null) patch.name = String(body.name).slice(0, 80)
  if (body.greeting != null) patch.greeting = String(body.greeting).slice(0, 500)
  if (body.color != null) patch.color = cleanColor(body.color)
  if (body.locale != null) patch.locale = body.locale === "ar" ? "ar" : "en"
  if (body.allowed_domains != null) patch.allowed_domains = cleanDomains(body.allowed_domains)
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled
  const { data, error } = await supabase
    .from("webchat_widgets")
    .update(patch)
    .eq("id", body.id)
    .eq("user_id", result.igUser.id)
    .select("id, public_key, name, greeting, color, locale, allowed_domains, enabled")
    .maybeSingle()
  if (error || !data) return NextResponse.json({ error: "Widget not found" }, { status: 404 })
  await supabase
    .from("platform_connections")
    .update({
      metadata: {
        name: data.name,
        greeting: data.greeting,
        color: data.color,
        locale: data.locale,
        allowed_domains: data.allowed_domains,
      },
    })
    .eq("user_id", result.igUser.id)
    .eq("platform", "webchat")
    .eq("page_id", data.public_key)
  return NextResponse.json({ widget: publicWidget(data, request) })
}
