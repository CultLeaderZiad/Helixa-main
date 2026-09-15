export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSessionUser(request)
    if (authResult.response) return authResult.response
    const { user: account, igUser } = authResult

    const supabase = await getSupabaseBypassClient()

    // 1. Fetch connected Facebook page token
    let conn: any = null
    if (igUser) {
      const { data } = await supabase
        .from("platform_connections")
        .select("id, access_token, page_id, metadata")
        .eq("user_id", igUser.id)
        .in("platform", ["facebook", "messenger"])
        .order("connected_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      conn = data
    }

    if (!conn && account) {
      const { data } = await supabase
        .from("platform_connections")
        .select("id, access_token, page_id, metadata")
        .eq("user_id", account.id)
        .in("platform", ["facebook", "messenger"])
        .order("connected_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      conn = data
    }

    if (!conn || !conn.access_token || !conn.page_id) {
      return NextResponse.json({
        data: [],
        warning: "No connected Facebook Page found. Please connect your page in Connected Platforms.",
      })
    }

    const { page_id, access_token, metadata } = conn

    // 2. Fetch recent posts from the Page via Graph API
    const graphUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(
      page_id
    )}/posts?fields=id,message,created_time,full_picture,permalink_url,attachments{media_type,unshimmed_url}&limit=30&access_token=${encodeURIComponent(
      access_token
    )}`

    const res = await fetch(graphUrl, { cache: "no-store" })
    const data = await res.json()

    if (data.error) {
      console.error("[FB Posts] Graph API Error:", data.error)
      if (data.error.code === 190) {
        return NextResponse.json(
          { error: "Facebook access token expired. Please reconnect your Facebook Page in Connected Platforms." },
          { status: 401 }
        )
      }
      return NextResponse.json({ error: data.error.message || "Failed to fetch Facebook posts" }, { status: 500 })
    }

    const rawPosts = Array.isArray(data.data) ? data.data : []
    const posts = rawPosts.map((p: any) => ({
      id: String(p.id),
      caption: p.message || "",
      image_url: p.full_picture || null,
      thumbnail_url: p.full_picture || null,
      permalink: p.permalink_url || null,
      timestamp: p.created_time || null,
      media_type: "POST",
      author_name: metadata?.name || "Facebook Page",
    }))

    return NextResponse.json({ data: posts })
  } catch (error: any) {
    console.error("[FB Posts] Server Error:", error)
    return NextResponse.json({ error: error?.message || "Server error fetching Facebook posts" }, { status: 500 })
  }
}
