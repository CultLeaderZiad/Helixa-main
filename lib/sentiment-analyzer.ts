import { generateGroqCompletion, GroqMessage } from "@/lib/groq-client"

export interface SentimentAnalysisResult {
  sentiment: "positive" | "neutral" | "negative"
  confidence: number
}

export interface PostSentimentStats {
  hasData: boolean
  total: number
  positive: number
  neutral: number
  negative: number
  positivePercent: number
  neutralPercent: number
  negativePercent: number
}

/**
 * Classifies the sentiment of a social media comment using Groq and caches the result
 * into the `comment_sentiment` table.
 */
export async function classifyAndCacheCommentSentiment(
  supabase: any,
  accountId: string,
  postId: string,
  commentId: string,
  commentText: string
): Promise<SentimentAnalysisResult | null> {
  if (!commentText || !commentText.trim()) return null

  try {
    // 1. Check if sentiment was already cached
    const { data: cached } = await supabase
      .from("comment_sentiment")
      .select("sentiment, confidence")
      .eq("comment_id", String(commentId))
      .maybeSingle()

    if (cached) {
      return {
        sentiment: cached.sentiment as "positive" | "neutral" | "negative",
        confidence: Number(cached.confidence) || 1.0,
      }
    }

    // 2. Classify via Groq
    const messages: GroqMessage[] = [
      {
        role: "system",
        content: `You are an accurate, objective sentiment analysis engine for social media comments.
Classify the comment into exactly one of these categories: "positive", "neutral", or "negative".
Return ONLY valid JSON in this exact structure:
{"sentiment": "positive" | "neutral" | "negative", "confidence": 0.0 to 1.0}
Do not include markdown blocks or any conversational filler.`,
      },
      {
        role: "user",
        content: `Comment: "${commentText}"`,
      },
    ]

    const raw = await generateGroqCompletion(accountId, "sentiment_analysis", {
      messages,
      temperature: 0.1,
      max_tokens: 60,
    })

    if (!raw) return null

    let sentiment: "positive" | "neutral" | "negative" = "neutral"
    let confidence = 0.9

    try {
      const cleanJson = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim()
      const parsed = JSON.parse(cleanJson)
      if (["positive", "neutral", "negative"].includes(parsed.sentiment)) {
        sentiment = parsed.sentiment
      }
      if (typeof parsed.confidence === "number" && parsed.confidence >= 0 && parsed.confidence <= 1) {
        confidence = parsed.confidence
      }
    } catch {
      // Fallback keyword heuristic if JSON parsing failed
      const lower = raw.toLowerCase()
      if (lower.includes("positive")) sentiment = "positive"
      else if (lower.includes("negative")) sentiment = "negative"
      else sentiment = "neutral"
    }

    // 3. Cache into comment_sentiment table
    try {
      await supabase.from("comment_sentiment").upsert(
        {
          account_id: accountId,
          external_post_id: String(postId),
          comment_id: String(commentId),
          comment_text: commentText,
          sentiment,
          confidence,
          created_at: new Date().toISOString(),
        },
        { onConflict: "comment_id" }
      )
    } catch (dbErr) {
      console.warn("[sentiment-analyzer] DB caching notice:", dbErr)
    }

    return { sentiment, confidence }
  } catch (err) {
    console.error("[sentiment-analyzer] Error analyzing comment sentiment:", err)
    return null
  }
}

/**
 * Calculates real, honest sentiment breakdown for a specific post.
 * If 0 comments exist, returns hasData: false (no fabricated percentages).
 */
export async function getPostSentimentBreakdown(
  supabase: any,
  externalPostId: string
): Promise<PostSentimentStats> {
  const emptyState: PostSentimentStats = {
    hasData: false,
    total: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    positivePercent: 0,
    neutralPercent: 0,
    negativePercent: 0,
  }

  if (!externalPostId) return emptyState

  try {
    // Check both exact post_id and suffix match (e.g. pageId_postId vs postId)
    const cleanId = externalPostId.includes("_") ? externalPostId.split("_").pop()! : externalPostId

    const { data: rows, error } = await supabase
      .from("comment_sentiment")
      .select("sentiment")
      .or(`external_post_id.eq.${externalPostId},external_post_id.eq.${cleanId},external_post_id.ilike.%_${cleanId}`)

    if (error || !rows || rows.length === 0) {
      return emptyState
    }

    let pos = 0
    let neu = 0
    let neg = 0

    for (const r of rows) {
      if (r.sentiment === "positive") pos++
      else if (r.sentiment === "negative") neg++
      else neu++
    }

    const total = rows.length
    return {
      hasData: true,
      total,
      positive: pos,
      neutral: neu,
      negative: neg,
      positivePercent: Math.round((pos / total) * 100),
      neutralPercent: Math.round((neu / total) * 100),
      negativePercent: Math.round((neg / total) * 100),
    }
  } catch (err) {
    console.error("[sentiment-analyzer] Error querying sentiment stats:", err)
    return emptyState
  }
}
