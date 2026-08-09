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
      .select("ai_themes_last_analyzed_at")
      .eq("id", igUser.id)
      .single()

    const lastAnalyzed = userData?.ai_themes_last_analyzed_at
    if (lastAnalyzed && new Date().getTime() - new Date(lastAnalyzed).getTime() < 24 * 60 * 60 * 1000) {
       // Return current themes instead of generating new ones if within 24h limit, unless forced
       const { searchParams } = new URL(request.url)
       const force = searchParams.get("force") === "true"
       if (!force) {
           const { data: themes } = await supabase.from("ai_comment_themes").select("*").eq("user_id", igUser.id).order('count', { ascending: false })
           return NextResponse.json({ themes })
       }
    }

    // Fetch recent comment webhooks (last 14 days)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { data: events, error: eventsError } = await supabase
      .from("webhook_events")
      .select("data")
      .eq("user_id", igUser.id)
      .gte("processed_at", fourteenDaysAgo.toISOString())

    if (eventsError) throw eventsError

    const comments = events
      ?.filter(e => e.data?.field === "comments" || e.data?.object === "instagram")
      .map(e => {
        // Extract comment text from payload depending on exactly how it's shaped.
        // E.g., for Instagram comment webhook: data.value.text
        return e.data?.value?.text || e.data?.text || ""
      })
      .filter(text => text && typeof text === "string" && text.length > 2) || []

    if (comments.length === 0) {
      return NextResponse.json({ themes: [], message: "Not enough comment data to analyze." })
    }

    const messages = [
      {
        role: "system",
        content: `You are an expert data analyst. Group the following Instagram comments into 3-5 distinct "themes". 
For each theme provide:
1. "theme": A short title
2. "keywords": A comma-separated list of 2-4 keywords representing the theme
3. "examples": A representative quote or short summary of the comments in this theme
4. "count": Estimated number of comments in this theme

Return ONLY a JSON array of these objects.`
      },
      {
        role: "user",
        content: `Comments to analyze:\n${comments.slice(0, 100).join("\n")}`
      }
    ]

    const completion = await generateGroqCompletion(igUser.id, "analyze_themes", {
      messages: messages as any,
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" } // Using json object wrapping an array if needed, or rely on prompt
    })

    if (!completion) {
      return NextResponse.json({ error: "Failed to generate themes or rate limit exceeded" }, { status: 429 })
    }

    let parsed = []
    try {
      const maybeParsed = JSON.parse(completion)
      parsed = Array.isArray(maybeParsed) ? maybeParsed : (maybeParsed.themes || Object.values(maybeParsed)[0])
    } catch {
      // Fallback
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    // Save to DB
    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      // Delete old themes
      await supabase.from("ai_comment_themes").delete().eq("user_id", igUser.id)

      const rows = parsed.map(t => ({
        user_id: igUser.id,
        theme: t.theme || "General",
        keywords: t.keywords || "",
        examples: t.examples || "",
        count: t.count || 1
      }))

      await supabase.from("ai_comment_themes").insert(rows)
      await supabase.from("users").update({ ai_themes_last_analyzed_at: new Date().toISOString() }).eq("id", igUser.id)

      const { data: themes } = await supabase.from("ai_comment_themes").select("*").eq("user_id", igUser.id).order('count', { ascending: false })
      return NextResponse.json({ themes })
    }

    return NextResponse.json({ themes: [] })

  } catch (error: any) {
    console.error("[analyze-comment-themes] Server error:", error)
    if (error.message === "AI limit exceeded for today.") {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
