export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import { getPostSentimentBreakdown, classifyAndCacheCommentSentiment } from "@/lib/sentiment-analyzer"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSessionUser(request)
    if (authResult.response) return authResult.response
    const { user: account } = authResult

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("postId")
    const postIdsParam = searchParams.get("postIds")

    const supabase = await getSupabaseBypassClient()

    if (postId) {
      const stats = await getPostSentimentBreakdown(supabase, postId)
      return NextResponse.json({ postId, stats })
    }

    if (postIdsParam) {
      const ids = postIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      const results: Record<string, any> = {}

      await Promise.all(
        ids.map(async (id) => {
          results[id] = await getPostSentimentBreakdown(supabase, id)
        })
      )

      return NextResponse.json({ results })
    }

    // Default: fetch all sentiments for this account grouped by external_post_id
    const { data: rows, error } = await supabase
      .from("comment_sentiment")
      .select("external_post_id, sentiment")
      .eq("account_id", account.id)

    if (error || !rows) {
      return NextResponse.json({ results: {} })
    }

    const grouped: Record<string, { total: number; positive: number; neutral: number; negative: number }> = {}
    for (const r of rows) {
      const pid = r.external_post_id
      if (!grouped[pid]) {
        grouped[pid] = { total: 0, positive: 0, neutral: 0, negative: 0 }
      }
      grouped[pid].total++
      if (r.sentiment === "positive") grouped[pid].positive++
      else if (r.sentiment === "negative") grouped[pid].negative++
      else grouped[pid].neutral++
    }

    const finalResults: Record<string, any> = {}
    for (const [pid, s] of Object.entries(grouped)) {
      finalResults[pid] = {
        hasData: s.total > 0,
        total: s.total,
        positive: s.positive,
        neutral: s.neutral,
        negative: s.negative,
        positivePercent: Math.round((s.positive / s.total) * 100),
        neutralPercent: Math.round((s.neutral / s.total) * 100),
        negativePercent: Math.round((s.negative / s.total) * 100),
      }
    }

    return NextResponse.json({ results: finalResults })
  } catch (error: any) {
    console.error("[post-sentiment] API error:", error)
    return NextResponse.json({ error: error.message || "Failed to load sentiment" }, { status: 500 })
  }
}

/**
 * On-demand endpoint to analyze a specific comment or backfill unanalyzed comments
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSessionUser(request)
    if (authResult.response) return authResult.response
    const { user: account } = authResult

    const body = await request.json().catch(() => ({}))
    const { postId, commentId, commentText } = body

    if (!postId || !commentId || !commentText) {
      return NextResponse.json({ error: "Missing postId, commentId, or commentText" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()
    const result = await classifyAndCacheCommentSentiment(
      supabase,
      account.id,
      String(postId),
      String(commentId),
      String(commentText)
    )

    if (!result) {
      return NextResponse.json({ error: "Sentiment analysis failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true, sentiment: result })
  } catch (error: any) {
    console.error("[post-sentiment] POST error:", error)
    return NextResponse.json({ error: error.message || "Failed to analyze comment" }, { status: 500 })
  }
}
