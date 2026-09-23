export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import { generateCompletion, isAgentEnabled } from "@/lib/llm-provider"

/**
 * GET /api/ai/weekly-digest
 *
 * Returns the latest stored Weekly Coach digest for the signed-in account.
 * If none exists yet (cron hasn't run for this account), it generates one
 * on-demand so the feature is never "fake empty" for active accounts.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSessionUser(request)
    if (authResult.response) return authResult.response
    const { user: account, igUser } = authResult

    const supabase = await getSupabaseBypassClient()

    const { data: latest } = await supabase
      .from("ai_coach_digests")
      .select("content, metrics, week_start, created_at, provider")
      .eq("account_id", account.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latest) {
      return NextResponse.json({ hasData: true, digest: latest.content, metrics: latest.metrics, week_start: latest.week_start, created_at: latest.created_at })
    }

    // No digest yet — check the agent toggle before generating on demand
    const enabled = await isAgentEnabled(account.id, "weekly_coach_digest")
    if (!enabled) {
      return NextResponse.json({ hasData: false, digest: null, reason: "agent_disabled" })
    }

    const bizUserId = igUser?.id
    if (!bizUserId) {
      return NextResponse.json({ hasData: false, digest: null, reason: "no_activity" })
    }

    const [eventsRes, messagesRes, convsRes] = await Promise.all([
      supabase.from("automation_events").select("event_type").eq("user_id", bizUserId).limit(200),
      supabase.from("messages").select("*", { count: "exact", head: true }).eq("user_id", bizUserId),
      supabase.from("conversations").select("*", { count: "exact", head: true }).eq("user_id", bizUserId),
    ])

    const totalEvents = eventsRes.data?.length || 0
    const totalMessages = messagesRes.count || 0
    const totalConvs = convsRes.count || 0

    if (totalEvents === 0 && totalMessages === 0 && totalConvs === 0) {
      return NextResponse.json({ hasData: false, digest: null, reason: "no_activity" })
    }

    const digest = await generateCompletion(
      String(bizUserId),
      account.id,
      "weekly_digest",
      "weekly_coach_digest",
      {
        messages: [
          {
            role: "system",
            content: `You are Helixa's Weekly Coach. Write a short performance digest (120 words max, 3-4 bullets) using ONLY the real numbers provided, and end with one recommended action.`,
          },
          {
            role: "user",
            content: `Account totals:\n- Automation events: ${totalEvents}\n- Messages: ${totalMessages}\n- Conversations: ${totalConvs}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 320,
      }
    )

    if (!digest) {
      return NextResponse.json({ hasData: false, digest: null, reason: "ai_unavailable" })
    }

    return NextResponse.json({
      hasData: true,
      digest,
      metrics: { events: totalEvents, messages: totalMessages, conversations: totalConvs },
      week_start: null,
      created_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[weekly-digest] API error:", error)
    return NextResponse.json({ error: error.message || "Failed to load digest" }, { status: 500 })
  }
}
