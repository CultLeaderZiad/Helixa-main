import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSessionUser } from "@/lib/auth"
import { generateGroqCompletion } from "@/lib/groq-client"

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { automationId, keywords, intent } = await request.json()
    if (!keywords) {
      return NextResponse.json({ error: "Keywords are required" }, { status: 400 })
    }

    const messages = [
      {
        role: "system",
        content: `You are an expert social media strategist. The user has provided some trigger keywords for an automation.
Your task is to generate exactly 1 comma-separated string containing the original keywords PLUS 3-5 useful variations, common typos, or synonyms that match the user's intent.
Return ONLY the comma-separated string. No markdown, no explanations.`
      },
      {
        role: "user",
        content: `Original keywords: "${keywords}"\n${intent ? `Automation intent: ${intent}` : ''}`
      }
    ]

    const completion = await generateGroqCompletion(user.id, "keyword_suggestion", {
      messages: messages as any,
      temperature: 0.6,
      max_tokens: 150
    })

    if (!completion) {
      return NextResponse.json({ error: "Failed to generate suggestions or rate limit exceeded" }, { status: 429 })
    }

    // Clean up the output string just in case
    const suggestedKeywords = completion.replace(/^["'`]|["'`]$/g, '').trim()

    // Save suggestion to database
    if (automationId) {
      const supabase = await getSupabaseServerClient()
      const { data, error } = await supabase.from("ai_keyword_suggestions").insert({
        user_id: user.id,
        automation_id: automationId,
        original_keywords: keywords,
        suggested_keywords: suggestedKeywords,
        accepted: null
      }).select("id").single()

      if (error) {
        console.error("[keyword-suggestion] DB Error:", error)
      } else {
        return NextResponse.json({ 
          suggestion: { id: data.id, text: suggestedKeywords } 
        })
      }
    }

    return NextResponse.json({ suggestion: { text: suggestedKeywords } })

  } catch (error: any) {
    console.error("[keyword-suggestion] Server error:", error)
    if (error.message === "AI limit exceeded for today.") {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Endpoint to mark a keyword suggestion as accepted
export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { suggestionId, accepted } = await request.json()
    if (!suggestionId) return NextResponse.json({ error: "Suggestion ID is required" }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { error } = await supabase
      .from("ai_keyword_suggestions")
      .update({ accepted })
      .eq("id", suggestionId)
      .eq("user_id", user.id)

    if (error) {
      console.error("[keyword-suggestion] Patch error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[keyword-suggestion] Patch server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
