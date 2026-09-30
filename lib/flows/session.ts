import { type NextRequest, NextResponse } from "next/server"
import { requireSessionUser } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

export async function workspaceSession(request: NextRequest) {
  const result = await requireSessionUser(request)
  if (result.response) return { response: result.response as NextResponse }
  const userId = result.igUser?.id
  if (!userId) return { response: NextResponse.json({ error: "No workspace profile" }, { status: 400 }) }
  const supabase = await getSupabaseBypassClient()
  return {
    supabase,
    userId,
    workspaceId: result.workspace?.id || result.igUser?.workspace_id || null,
  }
}

export function isMissingTable(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message || ""
  return error?.code === "42P01" || error?.code === "PGRST205" || /schema cache|does not exist|Could not find the table/i.test(message)
}
