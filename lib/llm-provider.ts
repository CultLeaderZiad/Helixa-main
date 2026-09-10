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

  // 2. Fetch Agent Config — fall back to default Groq if agent row doesn't exist
  const supabase = await getSupabaseBypassClient()
  const { data: agent, error: agentError } = await supabase.from("agents").select("id, provider, requires_byok").eq("agent_key", agentKey).single()
  
  // If agent not found or DB error, default to Groq directly (most common case)
  if (!agent || agentError) {
    console.warn(`[llm-provider] Agent "${agentKey}" not found in DB, defaulting to Groq provider. Error:`, agentError?.message || "not found")
    if (!GROQ_API_KEY) {
      throw new GroqAPIError(500, "GROQ_API_KEY is not configured. Please add it to your Vercel environment variables at https://vercel.com/dashboard.")
    }
    const responseText = await callGroqAPI(options, GROQ_API_KEY)
    if (responseText) {
      const estTokens = Math.floor(responseText.length / 4)
      await logAIUsage(userId, feature, "groq", estTokens)
    }
    return responseText
  }

  let apiKey: string | undefined
  let provider = agent.provider

  // 3. Resolve API Key
  if (agent.requires_byok) {
    const key = await fetchByokKey(accountId, agent.id)
    if (!key) {
      console.warn(`[llm-provider] BYOK key missing for agent "${agentKey}", falling back to Groq.`)
      if (!GROQ_API_KEY) {
        throw new GroqAPIError(500, "GROQ_API_KEY is not configured. Please add it to your Vercel environment variables at https://vercel.com/dashboard.")
      }
      const responseText = await callGroqAPI(options, GROQ_API_KEY)
      if (responseText) {
        const estTokens = Math.floor(responseText.length / 4)
        await logAIUsage(userId, feature, "groq", estTokens)
      }
      return responseText
    }
    apiKey = key
  } else {
    // Helixa Managed Keys
    if (provider === "groq") apiKey = GROQ_API_KEY
    if (provider === "gemini") apiKey = GEMINI_API_KEY
    if (provider === "openrouter") apiKey = OPENROUTER_API_KEY
  }

  if (!apiKey) {
    // Fallback to Groq if the configured provider's key is missing
    console.warn(`[llm-provider] ${provider.toUpperCase()}_API_KEY missing, falling back to Groq.`)
    if (!GROQ_API_KEY) {
      throw new GroqAPIError(500, `${provider.toUpperCase()}_API_KEY is not configured and GROQ_API_KEY fallback is also missing. Please add GROQ_API_KEY to your Vercel environment variables at https://vercel.com/dashboard.`)
    }
    const responseText = await callGroqAPI(options, GROQ_API_KEY)
    if (responseText) {
      const estTokens = Math.floor(responseText.length / 4)
      await logAIUsage(userId, feature, "groq", estTokens)
    }
    return responseText
  }

  // 4. Execute based on Provider
  let responseText: string | null = null

  if (provider === "gemini") {
    try {
      responseText = await callGeminiAPI(options, apiKey)
    } catch (err: any) {
      console.warn(`[llm-provider] Gemini failed for ${feature}, falling back to Groq. Error:`, err.message)
      if (!GROQ_API_KEY) throw new GroqAPIError(500, "AI provider failed and no fallback available.")
      responseText = await callGroqAPI(options, GROQ_API_KEY)
      provider = "groq"
    }

  } else if (provider === "groq" || provider === "openrouter") {
    // Try Groq, fallback to OpenRouter
    try {
      responseText = await callGroqAPI(options, apiKey)
    } catch (err: any) {
      console.warn(`[llm-provider] Groq failed for ${feature}. Falling back to OpenRouter. Error:`, err.message)
      
      // Fallback to OpenRouter
      if (!OPENROUTER_API_KEY) {
        throw new GroqAPIError(500, "AI request failed and no fallback API key is configured.")
      }
      responseText = await callOpenRouterAPI(options, OPENROUTER_API_KEY)
      provider = "openrouter"
    }
  }

  // 5. Log usage
  if (responseText) {
    const estTokens = Math.floor(responseText.length / 4)
    await logAIUsage(userId, feature, provider, estTokens)
  }

  return responseText
}

// Low-level HTTP Callers

async function callGeminiAPI(options: GroqCompletionRequest, apiKey: string) {
  const model = options.model || "gemini-2.0-flash"

  // Convert OpenAI-style messages to Gemini's contents format
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
  for (const msg of options.messages) {
    const role = msg.role === "assistant" ? "model" : "user"
    // Gemini expects alternating user/model roles.
    // If the last entry is already the same role, merge into it.
    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += "\n" + msg.content
    } else {
      contents.push({ role, parts: [{ text: msg.content }] })
    }
  }

  const generationConfig: Record<string, unknown> = {}
  if (options.temperature != null) generationConfig.temperature = options.temperature
  if (options.max_tokens != null) generationConfig.maxOutputTokens = options.max_tokens
  if (options.response_format?.type === "json_object") {
    generationConfig.responseMimeType = "application/json"
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents, generationConfig })
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Gemini API Error: ${res.status} - ${txt}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    throw new Error(`Gemini API returned no text. Response: ${JSON.stringify(data)}`)
  }
  return text
}

async function callGroqAPI(options: GroqCompletionRequest, apiKey: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: options.model || "llama-3.3-70b-versatile",
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
      model: options.model || "meta-llama/llama-3.3-70b-instruct", // OpenRouter model
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
