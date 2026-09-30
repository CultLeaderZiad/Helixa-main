export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireUser } from "@/lib/auth"
import { oauthCookieOptions } from "@/lib/instagram-oauth"
import { WORKSPACE_COOKIE } from "@/lib/workspace-access"
import { listMemberships } from "@/lib/workspaces"

/**
 * POST /api/workspaces/switch  { workspaceId }
 * Saves the choice on the account and in an httpOnly cookie. The id has to
 * be one of this account's memberships.
 */
export async function POST(request: NextRequest) {
  const result = await requireUser(request)
  if (result.response) return result.response

  let body: { workspaceId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 })

  const supabase = await getSupabaseBypassClient()
  const memberships = await listMemberships(supabase, result.user.id)
  if (memberships === null) {
    return NextResponse.json({ error: "Workspaces are not installed yet" }, { status: 503 })
  }
  const membership = memberships.find((item) => item.workspaceId === body.workspaceId)
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { error } = await supabase
    .from("accounts")
    .update({ active_workspace_id: membership.workspaceId })
    .eq("id", result.user.id)
  if (error && !/active_workspace_id/i.test(error.message || "")) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const response = NextResponse.json({
    workspace: {
      id: membership.workspaceId,
      name: membership.name,
      role: membership.role,
    },
  })
  response.cookies.set(WORKSPACE_COOKIE, membership.workspaceId, oauthCookieOptions(60 * 60 * 24 * 365))
  return response
}
