export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import { generateCompletion, isAgentEnabled } from "@/lib/llm-provider"

/**
 * POST /api/ai/hook-strength
 *
 * Implements the `hook_strength_checker` agent that previously existed only as
 * a database row with no runtime. Scores the first-line/hook of a caption
 * (either supplied in the body or taken from the account's most recent cached
 * post) and returns a structured score + rewrite suggestions.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSessionUser(request)
    if (authResult.response) return authResult.response
    const { user: account, igUser } = authResult

    const supabase = await getSupabaseBypassClient()

    let caption: string | null = null
    let source = "manual"

    try {
      const body = await request.json()
      if (typeof body?.caption === "string" && body.caption.trim()) {
        caption = body.caption.trim()
      }
    } catch {
      // no body supplied — fall back to latest post
    }

    const bizUserId = igUser?.id
    if (!caption && bizUserId) {
      const { data: cached } = await supabase
        .from("media_cache")
        .select("caption, media_type, timestamp")
        .eq("user_id", bizUserId)
        .not("caption", "is", null)
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cached?.caption) {
        caption = cached.caption
        source = "latest_post"
      }
    }

    if (!caption) {
      return NextResponse.json({
        hasData: false,
        error: "No caption available. Pass a { caption } in the request body or publish a post first.",
      }, { status: 400 })
    }

    if (!(await isAgentEnabled(account.id, "hook_strength_checker"))) {
      return NextResponse.json({ hasData: false, reason: "agent_disabled" })
    }

    const raw = await generateCompletion(
      String(bizUserId || account.id),
      account.id,
      "hook_strength",
      "hook_strength_checker",
      {
        messages: [
          {
            role: "system",
            content: `You are a ruthless short-form video hook doctor (Instagram Reels / TikTok).
Analyse the provided caption and its opening line. Return ONLY valid JSON with this exact shape:
{"score": 0-100, "verdict": "strong"|"average"|"weak", "strengths": ["..."], "problems": ["..."], "rewrites": ["...", "...", "..."]}
Rules:
- Judge the FIRST LINE hardest (that is the scroll-stopper).
- rewrites must be 3 alternative first lines under 12 words each.
- No markdown, no commentary outside the JSON.`,
          },
          {
            role: "user",
            content: `Caption:\n"""${caption.slice(0, 1200)}"""`,
          },
        ],
        temperature: 0.4,
        max_tokens: 420,
        response_format: { type: "json_object" },
      }
    )

    if (!raw) {
      return NextResponse.json({ hasData: false, error: "AI is unavailable right now." }, { status: 503 })
    }

    let parsed: any = null
    try {
      const clean = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim()
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ hasData: true, caption, source, raw, score: null })
    }

    return NextResponse.json({
      hasData: true,
      caption,
      source,
      score: typeof parsed?.score === "number" ? parsed.score : null,
      verdict: parsed?.verdict || null,
      strengths: Array.isArray(parsed?.strengths) ? parsed.strengths : [],
      problems: Array.isArray(parsed?.problems) ? parsed.problems : [],
      rewrites: Array.isArray(parsed?.rewrites) ? parsed.rewrites : [],
    })
  } catch (error: any) {
    console.error("[hook-strength] API error:", error)
    return NextResponse.json({ error: error.message || "Failed to analyse hook" }, { status: 500 })
  }
}
