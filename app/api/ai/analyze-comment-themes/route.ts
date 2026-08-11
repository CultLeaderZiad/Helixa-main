import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"
import { generateGroqCompletion } from "@/lib/groq-client"

// GET: fetch current themes (and re-analyze if 24h+ old or ?force=true)
export async function GET(request: NextRequest) {
  try {
    const result = await requireInstagramUser(request)
    if (result.response) return result.response
    const { igUser } = result

    const supabase = await getSupabaseBypassClient()
    const { searchParams } = new URL(request.url)
    const force = searchParams.get("force") === "true"

    // Rate Limit Check (24 hours)
    const { data: userData } = await supabase
      .from("users")
      .select("ai_themes_last_analyzed_at")
      .eq("id", igUser.id)
      .single()

    const lastAnalyzed = userData?.ai_themes_last_analyzed_at
    const isStale = !lastAnalyzed || (new Date().getTime() - new Date(lastAnalyzed).getTime() > 24 * 60 * 60 * 1000)

    // If within 24h and not forced, return cached results
    if (!isStale && !force) {
      const { data: themes } = await supabase
        .from("ai_comment_themes")
        .select("*")
        .eq("user_id", igUser.id)
        .order("count", { ascending: false })
      return NextResponse.json({ themes: themes || [], last_analyzed_at: lastAnalyzed, is_stale: false })
    }

    // Otherwise do full analysis
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
      .map(e => e.data?.value?.text || e.data?.text || "")
      .filter(text => text && typeof text === "string" && text.length > 2) || []

    if (comments.length === 0) {
      const { data: existingThemes } = await supabase
        .from("ai_comment_themes")
        .select("*")
        .eq("user_id", igUser.id)
        .order("count", { ascending: false })
      return NextResponse.json({
        themes: existingThemes || [],
        last_analyzed_at: lastAnalyzed,
        is_stale: isStale,
        message: "Not enough comment data to analyze."
      })
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

Return ONLY a valid JSON object with a "themes" array.`
      },
      {
        role: "user",
        content: `Comments to analyze:\n${comments.slice(0, 100).join("\n")}`
      }
    ]

    const completion = await generateGroqCompletion(igUser.id, "analyze_themes", {
      messages: messages as any,
      temperature: 0.2,
      max_tokens: 600,
      response_format: { type: "json_object" }
    })

    if (!completion) {
      const { data: existingThemes } = await supabase
        .from("ai_comment_themes")
        .select("*")
        .eq("user_id", igUser.id)
        .order("count", { ascending: false })
      return NextResponse.json({ themes: existingThemes || [], last_analyzed_at: lastAnalyzed, is_stale: true, error: "Rate limit or AI unavailable" })
    }

    let parsed: any[] = []
    try {
      const maybeParsed = JSON.parse(completion)
      parsed = Array.isArray(maybeParsed) ? maybeParsed : (maybeParsed.themes || Object.values(maybeParsed)[0] as any[])
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 })
    }

    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      await supabase.from("ai_comment_themes").delete().eq("user_id", igUser.id)

      const rows = parsed.map(t => ({
        user_id: igUser.id,
        theme: t.theme || "General",
        keywords: t.keywords || "",
        examples: t.examples || "",
        count: t.count || 1
      }))

      await supabase.from("ai_comment_themes").insert(rows)
      const now = new Date().toISOString()
      await supabase.from("users").update({ ai_themes_last_analyzed_at: now }).eq("id", igUser.id)

      const { data: themes } = await supabase
        .from("ai_comment_themes")
        .select("*")
        .eq("user_id", igUser.id)
        .order("count", { ascending: false })
      return NextResponse.json({ themes: themes || [], last_analyzed_at: now, is_stale: false })
    }

    return NextResponse.json({ themes: [], last_analyzed_at: lastAnalyzed, is_stale: isStale })

  } catch (error: any) {
    console.error("[analyze-comment-themes] GET error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: force re-analyze
export async function POST(request: NextRequest) {
  // Delegate to GET with force=true
  const url = new URL(request.url)
  url.searchParams.set("force", "true")
  return GET(new Request(url.toString(), { headers: request.headers }) as NextRequest)
}
