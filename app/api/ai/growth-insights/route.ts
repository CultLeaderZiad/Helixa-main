export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import { generateGroqCompletion } from "@/lib/groq-client"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSessionUser(request)
    if (authResult.response) return authResult.response
    const { user: account, igUser } = authResult
    const igUserId = igUser?.id || account.id

    const supabase = await getSupabaseBypassClient()

    // 1. Fetch real posts from platform_content
    const { data: platformPosts } = await supabase
      .from("platform_content")
      .select("platform, external_post_id, caption, author_name, created_at")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })
      .limit(10)

    // 2. Fetch real posts from media_cache
    let igMediaPosts: any[] = []
    if (igUser) {
      const { data: cached } = await supabase
        .from("media_cache")
        .select("media_id, caption, media_type, timestamp")
        .eq("user_id", igUser.id)
        .order("timestamp", { ascending: false })
        .limit(10)
      igMediaPosts = cached || []
    }

    // 3. Real automation activity per post
    const { data: events } = await supabase
      .from("automation_events")
      .select("post_id, event_type, platform, created_at")
      .eq("user_id", igUserId)
      .order("created_at", { ascending: false })
      .limit(100)

    const eventsByPost: Record<string, number> = {}
    for (const ev of events || []) {
      if (ev.post_id) {
        eventsByPost[ev.post_id] = (eventsByPost[ev.post_id] || 0) + 1
      }
    }

    // 4. Real comment sentiment records
    const { data: sentiments } = await supabase
      .from("comment_sentiment")
      .select("external_post_id, sentiment, comment_text")
      .eq("account_id", account.id)
      .limit(50)

    let totalSentimentAnalyzed = 0
    let posCount = 0
    let neuCount = 0
    let negCount = 0

    for (const s of sentiments || []) {
      totalSentimentAnalyzed++
      if (s.sentiment === "positive") posCount++
      else if (s.sentiment === "negative") negCount++
      else neuCount++
    }

    // 5. Funnel counts
    const [messagesSentRes, convsRes] = await Promise.all([
      supabase.from("messages").select("*", { count: "exact", head: true }).eq("user_id", igUserId),
      supabase.from("conversations").select("*", { count: "exact", head: true }).eq("user_id", igUserId),
    ])

    const totalMessages = messagesSentRes.count || 0
    const totalConvs = convsRes.count || 0
    const totalPostsTracked = (platformPosts?.length || 0) + igMediaPosts.length

    // If completely new account with 0 real data: honest empty state
    if (totalPostsTracked === 0 && (events?.length || 0) === 0 && totalMessages === 0) {
      return NextResponse.json({
        hasData: false,
        insights: "No automation or content activity recorded yet. Target your first post link or launch an automation to generate real-time growth insights based on your account's performance.",
        metrics: {
          totalPostsTracked: 0,
          totalEvents: 0,
          totalMessages: 0,
          sentimentAnalyzed: 0,
        },
      })
    }

    // 6. Build prompt strictly constrained to real account performance
    const accountContext = `
ACCOUNT REAL PERFORMANCE DATA (NO EXTERNAL/FABRICATED DATA):
- Linked Content Count: ${totalPostsTracked} (Facebook & Instagram)
- Total Automated Messages: ${totalMessages}
- Total Conversations Started: ${totalConvs}
- Conversion Rate: ${totalMessages > 0 ? ((totalConvs / totalMessages) * 100).toFixed(1) + "%" : "N/A"}
- Recent Events Logged: ${events?.length || 0}
- Activity by Post: ${JSON.stringify(eventsByPost)}
- Comment Sentiment Breakdown: ${totalSentimentAnalyzed > 0 ? `${Math.round((posCount / totalSentimentAnalyzed) * 100)}% Positive, ${Math.round((neuCount / totalSentimentAnalyzed) * 100)}% Neutral, ${Math.round((negCount / totalSentimentAnalyzed) * 100)}% Negative across ${totalSentimentAnalyzed} analyzed comments` : "No comments analyzed yet"}
- Sample Tracked Posts: ${JSON.stringify(
      (platformPosts || []).map((p) => ({
        platform: p.platform,
        id: p.external_post_id,
        caption: (p.caption || "").slice(0, 80),
      }))
    )}
`

    const messages: any[] = [
      {
        role: "system",
        content: `You are Helixa's Growth Intelligence Advisor.
You reason exclusively over the account's OWN REAL DATA provided below.
CRITICAL RULES:
1. Do NOT hallucinate or reference external trend research from Reddit, LinkedIn, X, or other platforms. That is strictly forbidden.
2. Formulate 2-3 specific, honest, data-backed observations referencing this account's actual numbers (e.g. mention actual conversion rates, post activity, or sentiment distribution).
3. If data in a category is sparse or zero, give direct guidance on what the creator should do next (e.g. "Target a specific high-traffic post with a keyword trigger to build conversion data").
4. Keep tone professional, encouraging, and direct. Max 140 words. Use bullet points.`,
      },
      {
        role: "user",
        content: accountContext,
      },
    ]

    let aiAdvice: string | null = null
    try {
      aiAdvice = await generateGroqCompletion(account.id, "growth_insights", {
        messages,
        temperature: 0.3,
        max_tokens: 280,
      })
    } catch (aiErr: any) {
      console.warn("[growth-insights] Groq generation notice:", aiErr?.message)
    }

    if (!aiAdvice) {
      aiAdvice = `• Your account currently has ${totalPostsTracked} content items tracked with ${totalMessages} automated messages delivered.\n• Conversion rate sits at ${totalMessages > 0 ? ((totalConvs / totalMessages) * 100).toFixed(1) + "%" : "baseline"}.\n• To accelerate growth, link your top-performing organic posts to specific keyword automations.`
    }

    return NextResponse.json({
      hasData: true,
      insights: aiAdvice,
      metrics: {
        totalPostsTracked,
        totalEvents: events?.length || 0,
        totalMessages,
        totalConvs,
        sentimentAnalyzed: totalSentimentAnalyzed,
        sentimentBreakdown: {
          positive: posCount,
          neutral: neuCount,
          negative: negCount,
        },
      },
    })
  } catch (error: any) {
    console.error("[growth-insights] API error:", error)
    return NextResponse.json({ error: error.message || "Failed to generate growth insights" }, { status: 500 })
  }
}
