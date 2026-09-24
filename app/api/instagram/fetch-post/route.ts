export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSessionUser(request)
    if (authResult.response) return authResult.response
    const { user: account, igUser } = authResult

    const body = await request.json().catch(() => ({}))
    const rawUrl = typeof body?.url === "string" ? body.url.trim() : ""

    if (!rawUrl) {
      return NextResponse.json({ error: "Missing post URL" }, { status: 400 })
    }

    const match = rawUrl.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|tv)\/([^\/?#&]+)/i)
    if (!match || !match[1]) {
      return NextResponse.json({ error: "Invalid Instagram post or reel URL" }, { status: 400 })
    }

    const shortcode = match[1]
    const supabase = await getSupabaseBypassClient()

    let externalPostId: string | null = null
    let caption = ""
    let thumbnailUrl: string | null = null
    let authorName = igUser?.username || "Instagram Creator"
    let permalink = `https://www.instagram.com/p/${shortcode}/`

    // 1. Try resolving via user's media_cache
    if (igUser) {
      const { data: cached } = await supabase
        .from("media_cache")
        .select("*")
        .eq("user_id", igUser.id)
        .or(`permalink.ilike.%${shortcode}%,media_id.eq.${shortcode}`)
        .limit(1)
        .maybeSingle()

      if (cached) {
        externalPostId = cached.media_id
        caption = cached.caption || ""
        thumbnailUrl = cached.image_url || cached.video_url || null
        if (cached.permalink) permalink = cached.permalink
      }
    }

    // 2. If not found in media_cache and user has an access token, query Instagram Graph API
    if (!externalPostId && igUser?.access_token) {
      try {
        const graphUrl = `https://graph.instagram.com/v24.0/me/media?fields=id,shortcode,caption,media_type,media_url,thumbnail_url,permalink&limit=100&access_token=${encodeURIComponent(igUser.access_token)}`
        const res = await fetch(graphUrl, { cache: "no-store" })
        const data = await res.json()

        if (Array.isArray(data?.data)) {
          const found = data.data.find((m: any) => m.shortcode === shortcode || m.permalink?.includes(shortcode))
          if (found) {
            externalPostId = found.id
            caption = found.caption || ""
            thumbnailUrl = found.thumbnail_url || found.media_url || null
            if (found.permalink) permalink = found.permalink
          }
        }
      } catch (err) {
        console.warn("[ig-fetch-post] Graph API lookup failed:", err)
      }
    }

    // 3. Try Instagram oEmbed as a fallback
    if (!externalPostId) {
      const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
      const appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET
      const appToken = appId && appSecret ? `${appId}|${appSecret}` : null
      const tokenToUse = igUser?.access_token || appToken

      if (tokenToUse) {
        try {
          const oembedUrl = `https://graph.facebook.com/v25.0/instagram_oembed?url=${encodeURIComponent(rawUrl)}&access_token=${encodeURIComponent(tokenToUse)}`
          const oembedRes = await fetch(oembedUrl, { cache: "no-store" })
          const oembedData = await oembedRes.json()

          if (oembedData && (oembedData.title || oembedData.author_name || oembedData.thumbnail_url)) {
            externalPostId = oembedData.media_id || shortcode
            if (oembedData.title) caption = oembedData.title
            if (oembedData.thumbnail_url) thumbnailUrl = oembedData.thumbnail_url
            if (oembedData.author_name) authorName = oembedData.author_name
          }
        } catch (err) {
          console.warn("[ig-fetch-post] Instagram oEmbed lookup failed:", err)
        }
      }
    }

    // Default to shortcode if still unresolved but URL is structurally valid
    if (!externalPostId) {
      externalPostId = shortcode
    }

    // 4. Save to platform_content table
    const postRecord = {
      account_id: account.id,
      platform: "instagram",
      external_post_id: String(externalPostId),
      permalink,
      caption: caption || `Instagram Post (${shortcode})`,
      thumbnail_url: thumbnailUrl,
      author_name: authorName,
      metadata: { shortcode, raw_url: rawUrl },
      updated_at: new Date().toISOString(),
    }

    try {
      const { error: insertErr } = await supabase
        .from("platform_content")
        .upsert(postRecord, { onConflict: "account_id,platform,external_post_id" })

      if (insertErr) {
        console.warn("[ig-fetch-post] Notice: could not persist to platform_content:", insertErr.message)
      }
    } catch (dbErr) {
      console.warn("[ig-fetch-post] platform_content upsert skipped:", dbErr)
    }

    return NextResponse.json({
      success: true,
      post: {
        id: String(externalPostId),
        external_post_id: String(externalPostId),
        platform: "instagram",
        permalink,
        caption: caption || `Instagram Post (${shortcode})`,
        thumbnail_url: thumbnailUrl,
        author_name: authorName,
      },
    })
  } catch (error: any) {
    console.error("[ig-fetch-post] Server error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error resolving Instagram post" },
      { status: 500 }
    )
  }
}
