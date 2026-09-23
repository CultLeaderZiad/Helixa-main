export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const result = await requireSessionUser(req)
    if (result.response) return result.response
    const { user: account, igUser } = result
    const igUserId = igUser?.id || account.id

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

    // Real per-variant A/B breakdown: aggregate automation_events.variant_id
    // joined against automation_variants for names. Previously this returned a
    // single hardcoded "Default Variant" which made A/B testing look fake.
    let variants: Array<{ id: string; name: string; sent: number; replied: number; converted: number }> = []
    try {
      const { data: variantEvents } = await supabase
        .from("automation_events")
        .select("variant_id, event_type")
        .eq("user_id", igUserId)
        .not("variant_id", "is", null)

      const { data: variantRows } = await supabase
        .from("automation_variants")
        .select("id, variant_name, automations!inner(user_id)")
        .eq("automations.user_id", igUserId)

      const nameById: Record<string, string> = {}
      for (const v of variantRows || []) nameById[v.id] = v.variant_name

      const counts: Record<string, { sent: number; replied: number; converted: number }> = {}
      for (const ev of variantEvents || []) {
        if (!ev.variant_id) continue
        if (!counts[ev.variant_id]) counts[ev.variant_id] = { sent: 0, replied: 0, converted: 0 }
        if (ev.event_type === "sent" || ev.event_type === "dm_sent" || ev.event_type === "comment_dm") counts[ev.variant_id].sent++
        if (ev.event_type === "dm_reply" || ev.event_type === "replied") counts[ev.variant_id].replied++
        if (ev.event_type === "converted" || ev.event_type === "link_click") counts[ev.variant_id].converted++
      }

      variants = Object.entries(counts).map(([id, c]) => ({
        id,
        name: nameById[id] || "Variant",
        ...c,
      }))
    } catch (variantErr) {
      console.warn("[funnel] Variant aggregation notice:", variantErr)
    }

    // Always include the default (control) line so the UI has a baseline
    variants.unshift({ id: "default", name: "Default (Control)", sent: sentCount, replied: repliedCount, converted: convCount })

    return NextResponse.json({
      funnel: funnelStages,
      variants,
    })
  } catch (error) {
    console.error("Funnel API error", error)
    return NextResponse.json({ error: "Something went wrong loading analytics. Please try again." }, { status: 500 })
  }
}

