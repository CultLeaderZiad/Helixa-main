import { getSupabaseServerClient } from "@/lib/supabase-server"

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

// Defaulting to 30 requests per user per day to protect Groq rate limits.
const MAX_AI_CALLS_PER_DAY = 30

export interface GroqMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface GroqCompletionRequest {
  model?: string
  messages: GroqMessage[]
  temperature?: number
  max_tokens?: number
}

export async function checkAILimit(userId: number | string): Promise<boolean> {
  const supabase = await getSupabaseServerClient()
  
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
    return false // Deny on error for safety
  }

  return (count || 0) < MAX_AI_CALLS_PER_DAY
}

export async function logAIUsage(
  userId: number | string,
  feature: string,
  model: string,
  tokensUsed: number
) {
  const supabase = await getSupabaseServerClient()
  await supabase.from("ai_usage_log").insert({
    user_id: userId,
    feature,
    model,
    tokens_used: tokensUsed,
  })
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
  if (!GROQ_API_KEY) {
    console.error("[groq-client] GROQ_API_KEY is missing.")
    return null
  }

  const isWithinLimit = await checkAILimit(userId)
  if (!isWithinLimit) {
    console.error(`[groq-client] User ${userId} exceeded daily AI limit.`)
    throw new Error("AI limit exceeded for today.")
  }

  const model = options.model || "llama3-8b-8192"

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
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || null
    const tokensUsed = data.usage?.total_tokens || 0

    // Log the usage immediately after success
    await logAIUsage(userId, feature, model, tokensUsed)

    return content
  } catch (error) {
    console.error("[groq-client] Network/Fetch error:", error)
    return null
  }
}
