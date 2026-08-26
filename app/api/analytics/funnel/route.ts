export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const result = await requireInstagramUser(req)
    if (result.response) return result.response
    const igUserId = result.igUser.id

    const supabase = await getSupabaseBypassClient()
    
    // Run all counts in parallel for better performance
    const [triggeredResult, sentResult, replyResult, convResult] = await Promise.all([
      supabase.from("messages").select("*", { count: 'exact', head: true }).eq("user_id", igUserId),
      supabase.from("messages").select("*", { count: 'exact', head: true }).eq("user_id", igUserId).eq("is_from_instagram", false),
      supabase.from("messages").select("*", { count: 'exact', head: true }).eq("user_id", igUserId).eq("is_from_instagram", true),
      supabase.from("conversations").select("*", { count: 'exact', head: true }).eq("user_id", igUserId)
    ]);

    // Try to get link_click count separately — table may not exist
    let clickCount = 0
    try {
      const clickResult = await supabase.from("automation_events").select("*", { count: 'exact', head: true }).eq("user_id", igUserId).eq("event_type", "link_click")
      clickCount = clickResult.count || 0
    } catch {
      // Table may not exist, default to 0
    }

    const triggeredCount = triggeredResult.count || 0
    const sentCount = sentResult.count || 0
    const repliedCount = replyResult.count || 0
    const convCount = convResult.count || 0

    // Process data for Funnel
    const funnelStages = {
      triggered: triggeredCount,
      sent: sentCount,
      replied: repliedCount,
      link_clicked: clickCount,
      converted: convCount
    }

    return NextResponse.json({
      funnel: funnelStages,
      variants: [{ id: "default", name: "Default Variant", sent: sentCount, replied: repliedCount, converted: convCount }]
    })
  } catch (error) {
    console.error("Funnel API error", error)
    return NextResponse.json({ error: "Something went wrong loading analytics. Please try again." }, { status: 500 })
  }
}

