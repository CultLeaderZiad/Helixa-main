import { getSupabaseBypassClient } from "@/lib/supabase-server"

const GROQ_API_KEY = process.env.GROQ_API_KEY || "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"
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

// Defaulting to 1000 requests per user per day to protect Groq rate limits.
const MAX_AI_CALLS_PER_DAY = 1000

export class GroqRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GroqRateLimitError"
  }
}

export class GroqAPIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = "GroqAPIError"
    this.status = status
  }
}

export interface GroqMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface GroqCompletionRequest {
  model?: string
  messages: GroqMessage[]
  temperature?: number
  max_tokens?: number
  response_format?: { type: "json_object" }
}

export async function checkAILimit(userId: number | string): Promise<boolean> {
  const supabase = await getSupabaseBypassClient()
  
  // Count usage for today
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from("ai_usage_log")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", today.toISOString())

  if (error) {
    console.error("[groq-client] Error checking AI limit:", error)
    throw new GroqAPIError(500, `Database error checking AI limit: ${error.message}`)
  }

  return (count || 0) < MAX_AI_CALLS_PER_DAY
}

export async function logAIUsage(
  userId: number | string,
  feature: string,
  model: string,
  tokensUsed: number
) {
  try {
    const supabase = await getSupabaseBypassClient()
    const { error } = await supabase.from("ai_usage_log").insert({
      user_id: userId,
      feature,
      model,
      tokens_used: tokensUsed,
    })
    if (error) {
      console.error("[groq-client] Error logging AI usage:", error)
    }
  } catch (err) {
    console.error("[groq-client] Exception logging AI usage:", err)
  }
}

/**
 * Calls the Groq API if the user has not exceeded their daily limit.
 * Automatically logs the usage to `ai_usage_log`.
 */
export async function generateGroqCompletion(
  userId: number | string,
  feature: string,
  options: GroqCompletionRequest
): Promise<string | null> {
  console.log("[groq-client] API Key present:", !!GROQ_API_KEY)

  if (!GROQ_API_KEY) {
    console.error("[groq-client] GROQ_API_KEY is missing.")
    throw new GroqAPIError(500, "GROQ_API_KEY is not configured.")
  }

  const isWithinLimit = await checkAILimit(userId)
  if (!isWithinLimit) {
    console.error(`[groq-client] User ${userId} exceeded daily AI limit.`)
    throw new GroqRateLimitError("AI limit exceeded for today.")
  }

  const model = options.model || "llama-3.1-8b-instant"

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens,
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[groq-client] API error (${res.status}):`, errorText)
      if (res.status === 429) {
        throw new GroqRateLimitError(`Groq API rate limit reached: ${errorText}`)
      }
      throw new GroqAPIError(res.status, `Groq API returned ${res.status}: ${errorText}`)
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || null
    const tokensUsed = data.usage?.total_tokens || 0

    // Log the usage immediately after success
    await logAIUsage(userId, feature, model, tokensUsed)

    return content
  } catch (error: any) {
    if (error instanceof GroqRateLimitError || error instanceof GroqAPIError) {
      throw error;
    }
    console.error("[groq-client] Network/Fetch error:", error)
    throw new GroqAPIError(500, `Network/Fetch error: ${error.message || "Unknown error"}`)
  }
}
