export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireUser } from "@/lib/auth"
import { createWorkspace, listMemberships } from "@/lib/workspaces"

/**
 * GET /api/workspaces
 * Workspaces the signed-in account can open, plus the saved active id.
 *
 * POST /api/workspaces  { name }
 * Creates a client workspace owned by this login. Any authenticated account
 * can own workspaces; membership of the current workspace is not required.
 */
export async function GET(request: NextRequest) {
  const result = await requireUser(request)
  if (result.response) return result.response

  const supabase = await getSupabaseBypassClient()
  const memberships = await listMemberships(supabase, result.user.id)
  if (memberships === null) {
    return NextResponse.json({
      workspaces: [],
      activeWorkspaceId: null,
      migrationRequired: true,
    })
  }

  return NextResponse.json({
    workspaces: memberships.map((membership) => ({
      id: membership.workspaceId,
      name: membership.name,
      role: membership.role,
      ownerAccountId: membership.ownerAccountId,
    })),
    activeWorkspaceId: result.user.active_workspace_id || null,
  })
}

export async function POST(request: NextRequest) {
  const result = await requireUser(request)
  if (result.response) return result.response

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const supabase = await getSupabaseBypassClient()
  try {
    const workspace = await createWorkspace(supabase, result.user, body.name || "")
    const response = NextResponse.json({
      workspace: {
        id: workspace.workspaceId,
        name: workspace.name,
        role: workspace.role,
      },
    })
    const { WORKSPACE_COOKIE } = await import("@/lib/workspace-access")
    const { oauthCookieOptions } = await import("@/lib/instagram-oauth")
    response.cookies.set(WORKSPACE_COOKIE, workspace.workspaceId, oauthCookieOptions(60 * 60 * 24 * 365))
    return response
  } catch (error: any) {
    const message = error?.message || "Could not create workspace"
    const status = /not installed|does not exist|schema cache/i.test(message) ? 503 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
