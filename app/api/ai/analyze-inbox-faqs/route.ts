import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"
import { generateGroqCompletion } from "@/lib/groq-client"

export async function POST(request: NextRequest) {
  try {
    const result = await requireInstagramUser(request)
    if (result.response) return result.response
    const { igUser } = result

    const supabase = await getSupabaseBypassClient()

    // Rate Limit Check (24 hours)
    const { data: userData } = await supabase
      .from("users")
      .select("ai_faq_last_analyzed_at")
      .eq("id", igUser.id)
      .single()

    const lastAnalyzed = userData?.ai_faq_last_analyzed_at
    if (lastAnalyzed && new Date().getTime() - new Date(lastAnalyzed).getTime() < 24 * 60 * 60 * 1000) {
       const { searchParams } = new URL(request.url)
       const force = searchParams.get("force") === "true"
       if (!force) {
           const { data: faqs } = await supabase.from("ai_faq_suggestions").select("*").eq("user_id", igUser.id).eq("is_dismissed", false).order('count', { ascending: false })
           return NextResponse.json({ faqs })
       }
    }

    // Fetch recent DMs
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { data: messagesData, error: messagesError } = await supabase
      .from("messages")
      .select("content")
      .eq("user_id", igUser.id)
      .eq("is_from_instagram", true)
      .gte("created_at", fourteenDaysAgo.toISOString())

    if (messagesError) throw messagesError

    const dmMessages = messagesData?.map(m => m.content).filter(c => c && c.length > 3) || []

    if (dmMessages.length === 0) {
      return NextResponse.json({ faqs: [], message: "Not enough DM data to analyze." })
    }

    const messages = [
      {
        role: "system",
        content: `You are an expert customer support analyst. Group the following Instagram Direct Messages into 3-5 frequently asked questions (FAQs).
For each FAQ provide:
1. "question": A generalized question
2. "suggested_answer": A friendly, helpful drafted response
3. "count": Estimated number of similar messages

Return ONLY a JSON array of these objects.`
      },
      {
        role: "user",
        content: `Messages to analyze:\n${dmMessages.slice(0, 100).join("\n")}`
      }
    ]

    const completion = await generateGroqCompletion(igUser.id, "analyze_faqs", {
      messages: messages as any,
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" }
    })

    if (!completion) {
      return NextResponse.json({ error: "Failed to generate FAQs or rate limit exceeded" }, { status: 429 })
    }

    let parsed = []
    try {
      const maybeParsed = JSON.parse(completion)
      parsed = Array.isArray(maybeParsed) ? maybeParsed : (maybeParsed.faqs || Object.values(maybeParsed)[0])
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    // Save to DB
    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      await supabase.from("ai_faq_suggestions").delete().eq("user_id", igUser.id)

      const rows = parsed.map(f => ({
        user_id: igUser.id,
        question: f.question || "Unknown Question",
        suggested_answer: f.suggested_answer || "",
        count: f.count || 1,
        is_dismissed: false
      }))

      await supabase.from("ai_faq_suggestions").insert(rows)
      await supabase.from("users").update({ ai_faq_last_analyzed_at: new Date().toISOString() }).eq("id", igUser.id)

      const { data: faqs } = await supabase.from("ai_faq_suggestions").select("*").eq("user_id", igUser.id).eq("is_dismissed", false).order('count', { ascending: false })
      return NextResponse.json({ faqs })
    }

    return NextResponse.json({ faqs: [] })

  } catch (error: any) {
    console.error("[analyze-inbox-faqs] Server error:", error)
    if (error.message === "AI limit exceeded for today.") {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH to dismiss an FAQ
export async function PATCH(request: NextRequest) {
    try {
      const result = await requireInstagramUser(request)
      if (result.response) return result.response
      const { igUser } = result
  
      const { faqId, dismiss } = await request.json()
      if (!faqId) return NextResponse.json({ error: "FAQ ID is required" }, { status: 400 })
  
      const supabase = await getSupabaseBypassClient()
      const { error } = await supabase
        .from("ai_faq_suggestions")
        .update({ is_dismissed: dismiss })
        .eq("id", faqId)
        .eq("user_id", igUser.id)
  
      if (error) throw error
  
      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error("[analyze-inbox-faqs] Patch server error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }
