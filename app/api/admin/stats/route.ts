import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getSupabaseServerClient } from "@/lib/supabase-server"

/**
 * GET /api/admin/stats
 * Admin-only: counts for dashboard overview.
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request)
  if (result.response) return result.response

  try {
    const supabase = await getSupabaseServerClient()
    const now = new Date().toISOString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [
      { count: activeTrials },
      { count: monthlyUsers },
      { count: oneTimeUsers },
      { count: expiredUsers },
      { count: flaggedUsers },
      { count: automationsToday },
      { count: totalUsers },
    ] = await Promise.all([
      supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .eq("plan", "trial")
        .gt("trial_ends_at", now),
      supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .eq("plan", "monthly"),
      supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .eq("plan", "one_time"),
      supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .eq("plan", "expired"),
      supabase
        .from("accounts")
        .select("*", { count: "exact", head: true })
        .eq("is_flagged", true),
      supabase
        .from("automation_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString()),
      supabase
        .from("accounts")
        .select("*", { count: "exact", head: true }),
    ])

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers ?? 0,
        activeTrials: activeTrials ?? 0,
        monthlyUsers: monthlyUsers ?? 0,
        oneTimeUsers: oneTimeUsers ?? 0,
        expiredUsers: expiredUsers ?? 0,
        flaggedUsers: flaggedUsers ?? 0,
        automationsToday: automationsToday ?? 0,
      },
    })
  } catch (error: any) {
    console.error("[admin/stats] Error:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
