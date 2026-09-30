export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import {
  TRIGGER_EVENT_TYPES,
  bucketByDay,
  buildFunnel,
  messageIsInbound,
  tallyVariantEvents,
} from "@/lib/analytics-metrics"

async function countDirection(supabase: any, userId: string | number, direction: "in" | "out"): Promise<number> {
  const byDirection = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", direction)
  if (!byDirection.error) return byDirection.count || 0
  const legacy = await supabase
    .from("messages")
    .select("id, sender_id, is_from_instagram, conversations!inner(recipient_id)")
    .eq("user_id", userId)
    .limit(2000)
  if (legacy.error || !Array.isArray(legacy.data)) return 0
  return legacy.data.filter((row: any) => {
    const inbound = messageIsInbound(row, row.conversations?.recipient_id)
    return direction === "in" ? inbound : !inbound
  }).length
}

export async function GET(req: NextRequest) {
  try {
    const result = await requireSessionUser(req)
    if (result.response) return result.response
    const { igUser, user: account } = result
    const igUserId = igUser?.id || account.id
    const supabase = await getSupabaseBypassClient()

    const [triggeredResult, sent, replied, leadsResult, clickResult, variantEvents, variantRows, recentMessages, recentClicks] =
      await Promise.all([
        supabase
          .from("automation_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", igUserId)
          .in("event_type", [...TRIGGER_EVENT_TYPES]),
        countDirection(supabase, igUserId, "out"),
        countDirection(supabase, igUserId, "in"),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", igUserId),
        supabase
          .from("automation_events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", igUserId)
          .eq("event_type", "link_click"),
        supabase.from("automation_events").select("variant_id, event_type").eq("user_id", igUserId).not("variant_id", "is", null),
        supabase.from("automation_variants").select("id, variant_name, automations!inner(user_id)").eq("automations.user_id", igUserId),
        supabase
          .from("messages")
          .select("created_at, direction, is_from_instagram, sender_id")
          .eq("user_id", igUserId)
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("automation_events")
          .select("created_at")
          .eq("user_id", igUserId)
          .eq("event_type", "link_click")
          .order("created_at", { ascending: false })
          .limit(1000),
      ])

    const funnel = buildFunnel({
      triggered: triggeredResult.count || 0,
      sent,
      replied,
      linkClicked: clickResult.count || 0,
      leads: leadsResult.count || 0,
    })

    const nameById: Record<string, string> = {}
    for (const variant of variantRows.data || []) nameById[variant.id] = variant.variant_name
    const variants = tallyVariantEvents(variantEvents.data || []).map((row) => ({
      id: row.id,
      name: nameById[row.id] || "Variant",
      sent: row.sent,
      link_clicks: row.linkClicks,
    }))

    const now = Date.now()
    const seriesRows = [
      ...((recentMessages.data || []) as Array<{ created_at?: string; direction?: string | null; is_from_instagram?: boolean | null; sender_id?: string | null }>).map(
        (row) => ({
          at: row.created_at || "",
          kind: messageIsInbound(row) ? ("inbound" as const) : ("sent" as const),
        }),
      ),
      ...((recentClicks.data || []) as Array<{ created_at?: string }>).map((row) => ({
        at: row.created_at || "",
        kind: "click" as const,
      })),
    ]
    const series = bucketByDay(seriesRows, 14, now)

    return NextResponse.json({ funnel, variants, series })
  } catch (error) {
    console.error("Funnel API error", error)
    return NextResponse.json({ error: "Something went wrong loading analytics. Please try again." }, { status: 500 })
  }
}
