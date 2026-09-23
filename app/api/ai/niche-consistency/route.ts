export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import { generateCompletion, isAgentEnabled } from "@/lib/llm-provider"

/**
 * GET /api/ai/niche-consistency
 *
 * Implements the `niche_consistency` agent that previously existed only as a
 * database row with no runtime. Reads the account's recent captions and flags
 * topic drift away from the account's dominant niche.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSessionUser(request)
    if (authResult.response) return authResult.response
    const { user: account, igUser } = authResult

    const supabase = await getSupabaseBypassClient()
    const bizUserId = igUser?.id

    if (!bizUserId) {
      return NextResponse.json({ hasData: false, reason: "connect_platform_first" })
    }

    // Collect recent captions from both caches
    const [mediaRes, contentRes] = await Promise.all([
      supabase.from("media_cache").select("caption, media_type, timestamp").eq("user_id", bizUserId).not("caption", "is", null).order("timestamp", { ascending: false }).limit(20),
      supabase.from("platform_content").select("caption, platform, created_at").eq("account_id", account.id).not("caption", "is", null).order("created_at", { ascending: false }).limit(20),
    ])

    const captions: string[] = [
      ...(mediaRes.data || []).map((m: any) => m.caption),
      ...(contentRes.data || []).map((c: any) => c.caption),
    ].filter(Boolean).slice(0, 25)

    if (captions.length < 3) {
      return NextResponse.json({
        hasData: false,
        reason: "not_enough_content",
        message: "At least 3 published posts with captions are needed to analyse niche consistency.",
      })
    }

    if (!(await isAgentEnabled(account.id, "niche_consistency"))) {
      return NextResponse.json({ hasData: false, reason: "agent_disabled" })
    }

    const raw = await generateCompletion(
      String(bizUserId),
      account.id,
      "niche_consistency",
      "niche_consistency",
      {
        messages: [
          {
            role: "system",
            content: `You analyse whether a creator's recent content stays on-niche.
Return ONLY valid JSON:
{"niche": "<the dominant niche in 3-6 words>", "consistency_score": 0-100, "drift_detected": true|false, "off_topic_posts": ["<short caption excerpt>"], "recommendation": "<one sentence>"}
No markdown, no extra text.`,
          },
          {
            role: "user",
            content: `Recent captions (newest first):\n${captions.map((c, i) => `${i + 1}. ${String(c).slice(0, 200)}`).join("\n")}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
        response_format: { type: "json_object" },
      }
    )

    if (!raw) {
      return NextResponse.json({ hasData: false, reason: "ai_unavailable" })
    }

    let parsed: any = null
    try {
      parsed = JSON.parse(raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim())
    } catch {
      return NextResponse.json({ hasData: true, postsAnalyzed: captions.length, raw })
    }

    return NextResponse.json({
      hasData: true,
      postsAnalyzed: captions.length,
      niche: parsed?.niche || null,
      consistency_score: typeof parsed?.consistency_score === "number" ? parsed.consistency_score : null,
      drift_detected: !!parsed?.drift_detected,
      off_topic_posts: Array.isArray(parsed?.off_topic_posts) ? parsed.off_topic_posts : [],
      recommendation: parsed?.recommendation || null,
    })
  } catch (error: any) {
    console.error("[niche-consistency] API error:", error)
    return NextResponse.json({ error: error.message || "Failed to analyse niche consistency" }, { status: 500 })
  }
}
