import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"

/**
 * GET /api/admin/audit-log
 * Admin-only: returns recent admin_audit_log entries.
 * Query params: page, limit, target_user_id
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request)
  if (result.response) return result.response

  try {
    const supabase = await getSupabaseBypassClient()
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100)
    const offset = (page - 1) * limit
    const targetUserId = searchParams.get("target_user_id")

    let query = supabase
      .from("admin_audit_log")
      .select(
        `id, action, details, created_at,
         admin:admin_user_id(id, username),
         target:target_user_id(id, username)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (targetUserId) query = query.eq("target_user_id", targetUserId)

    const { data: logs, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    })
  } catch (error: any) {
    console.error("[admin/audit-log] Error:", error)
    return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 })
  }
}
