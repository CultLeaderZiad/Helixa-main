import { GroqMessage, GroqCompletionRequest, checkAILimit, logAIUsage, GroqAPIError, GroqRateLimitError } from "./groq-client"
import { getSupabaseBypassClient } from "./supabase-server"

// Check for required env vars for Helixa managed models
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// In a real implementation we would throw during module load or server startup if strictly required.
// But for graceful failure, we can check at runtime when the specific provider is called.

async function fetchByokKey(accountId: string, agentId: string): Promise<string | null> {
  const supabase = await getSupabaseBypassClient()
  const secret = process.env.BYOK_ENCRYPTION_SECRET
  if (!secret) return null

  const { data, error } = await supabase.rpc("get_agent_byok_key", {
    p_account_id: accountId,
    p_agent_id: agentId,
    p_secret: secret
  })

  if (error || !data) return null
  return data
}

export async function generateCompletion(
  userId: string,
  accountId: string,
  feature: string,
  agentKey: string,
  options: GroqCompletionRequest
): Promise<string | null> {
  
  // 1. Check AI Limit for managed usage
  const isWithinLimit = await checkAILimit(userId)
  if (!isWithinLimit) {
    throw new GroqRateLimitError("AI limit exceeded for today.")
  }

  // 2. Fetch Agent Config
  const supabase = await getSupabaseBypassClient()
  const { data: agent } = await supabase.from("agents").select("id, provider, requires_byok").eq("agent_key", agentKey).single()
  if (!agent) {
    throw new Error(`Unknown agent: ${agentKey}`)
  }

  let apiKey: string | undefined
  let provider = agent.provider

  // 3. Resolve API Key
  if (agent.requires_byok) {
    const key = await fetchByokKey(accountId, agent.id)
    if (!key) {
      throw new Error(`Agent ${agentKey} requires a connected BYOK API key.`)
    }
    apiKey = key
    // Provider could be overridden by BYOK settings, but we'll assume standard provider mapping or dynamic
  } else {
    // Helixa Managed Keys
    if (provider === "groq") apiKey = GROQ_API_KEY
    if (provider === "gemini") apiKey = GEMINI_API_KEY
    if (provider === "openrouter") apiKey = OPENROUTER_API_KEY
  }

  if (!apiKey) {
    throw new GroqAPIError(500, `${provider.toUpperCase()}_API_KEY is missing.`)
  }

  // 4. Execute based on Provider
  let responseText: string | null = null

  if (provider === "gemini") {
    // Execute Gemini API call (Simplified for this example)
    // Normally use @google/generative-ai
    console.log(`[llm-provider] Executing Gemini for ${feature}`)
    // ... Mocking response for architecture validation
    responseText = JSON.stringify({ result: "Gemini response placeholder" })

  } else if (provider === "groq" || provider === "openrouter") {
    // Try Groq, fallback to OpenRouter
    try {
      if (provider === "groq" && !GROQ_API_KEY) throw new Error("No Groq Key")
      responseText = await callGroqAPI(options, apiKey)
    } catch (err: any) {
      console.warn(`[llm-provider] Groq failed for ${feature}. Falling back to OpenRouter. Error:`, err.message)
      
      // Fallback to OpenRouter
      if (!OPENROUTER_API_KEY) {
        throw new GroqAPIError(500, "OPENROUTER_API_KEY is missing for fallback.")
      }
      responseText = await callOpenRouterAPI(options, OPENROUTER_API_KEY)
      provider = "openrouter" // For logging
    }
  }

  // 5. Log usage
  if (responseText) {
    // Estimating tokens for logging
    const estTokens = Math.floor(responseText.length / 4)
    await logAIUsage(userId, feature, provider, estTokens)
  }

  return responseText
}

// Low-level HTTP Callers (to keep dependencies minimal in this prompt)

async function callGroqAPI(options: GroqCompletionRequest, apiKey: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: options.model || "openai/gpt-oss-20b",
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      response_format: options.response_format
    })
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Groq API Error: ${res.status} - ${txt}`)
  }

  const data = await res.json()
  return data.choices[0]?.message?.content || null
}

async function callOpenRouterAPI(options: GroqCompletionRequest, apiKey: string) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://helixa.ai",
      "X-Title": "Helixa"
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b", // equivalent fallback
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      response_format: options.response_format
    })
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`OpenRouter API Error: ${res.status} - ${txt}`)
  }

  const data = await res.json()
  return data.choices[0]?.message?.content || null
}
