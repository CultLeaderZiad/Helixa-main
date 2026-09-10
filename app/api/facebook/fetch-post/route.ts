export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"

/**
 * Normalizes and extracts post ID or canonical reference from Facebook URLs
 */
function extractFacebookPostId(url: string, htmlSnippet?: string): string | null {
  // 1. Try to extract canonical href from oEmbed blockquote if present
  let target = url
  if (htmlSnippet) {
    const dataHrefMatch = htmlSnippet.match(/data-href=["']([^"']+)["']/i)
    if (dataHrefMatch && dataHrefMatch[1]) {
      target = dataHrefMatch[1]
    }
  }

  // 2. Regex matchers for standard Facebook post URLs
  const patterns = [
    /\/posts\/([a-zA-Z0-9_\-]+)/i,
    /story_fbid=([a-zA-Z0-9_\-]+)/i,
    /fbid=([a-zA-Z0-9_\-]+)/i,
    /\/videos\/([a-zA-Z0-9_\-]+)/i,
    /\/photos\/[^/]+\/([a-zA-Z0-9_\-]+)/i,
    /\/share\/p\/([a-zA-Z0-9_\-]+)/i,
    /\/share\/r\/([a-zA-Z0-9_\-]+)/i,
  ]

  for (const regex of patterns) {
    const match = target.match(regex)
    if (match && match[1]) {
      return match[1].replace(/[^a-zA-Z0-9_\-]/g, '')
    }
  }

  // Also check original URL
  for (const regex of patterns) {
    const match = url.match(regex)
    if (match && match[1]) {
      return match[1].replace(/[^a-zA-Z0-9_\-]/g, '')
    }
  }

  return null
}

/**
 * Extracts post caption and author name from oEmbed HTML snippet
 */
function parseOembedHtml(html: string): { caption: string; authorName: string; canonicalUrl: string } {
  let caption = ""
  let authorName = ""
  let canonicalUrl = ""

  // Extract canonical URL
  const dataHrefMatch = html.match(/data-href=["']([^"']+)["']/i)
  if (dataHrefMatch && dataHrefMatch[1]) {
    canonicalUrl = dataHrefMatch[1]
  }

  // Extract caption from <p>...</p>
  const pMatch = html.match(/<p>([\s\S]*?)<\/p>/i)
  if (pMatch && pMatch[1]) {
    caption = pMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  // Extract author from "Posted by <a ...>Name</a>"
  const authorMatch = html.match(/Posted by\s+<a[^>]*>([\s\S]*?)<\/a>/i)
  if (authorMatch && authorMatch[1]) {
    authorName = authorMatch[1].replace(/<[^>]+>/g, '').trim()
  }

  return { caption, authorName, canonicalUrl }
}

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

    if (!rawUrl.includes("facebook.com") && !rawUrl.includes("fb.watch") && !rawUrl.includes("fb.me")) {
      return NextResponse.json({ error: "Please enter a valid Facebook URL" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()

    // 1. Fetch connected Facebook page token for this account/user
    let fbToken: string | null = null
    let pageId: string | null = null
    let pageName: string | null = null

    if (igUser) {
      const { data: conn } = await supabase
        .from("platform_connections")
        .select("access_token, page_id, metadata")
        .eq("user_id", igUser.id)
        .in("platform", ["facebook", "messenger"])
        .order("connected_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (conn?.access_token) {
        fbToken = conn.access_token
        pageId = conn.page_id
        pageName = conn.metadata?.name || null
      }
    }

    // Fallback: check platform_connections linked to this account_id if available
    if (!fbToken) {
      const { data: accConn } = await supabase
        .from("platform_connections")
        .select("access_token, page_id, metadata")
        .eq("account_id", account.id)
        .in("platform", ["facebook", "messenger"])
        .order("connected_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (accConn?.access_token) {
        fbToken = accConn.access_token
        pageId = accConn.page_id
        pageName = accConn.metadata?.name || null
      }
    }

    // App token fallback if page token not found
    const appId = process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
    const appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET
    const appToken = appId && appSecret ? `${appId}|${appSecret}` : null
    const activeToken = fbToken || appToken

    // 2. Resolve redirects if URL is a mobile/share link (e.g. facebook.com/share/p/...)
    let resolvedUrl = rawUrl
    if (rawUrl.includes("/share/") || rawUrl.includes("fb.watch") || rawUrl.includes("fb.me")) {
      try {
        const headRes = await fetch(rawUrl, {
          method: "HEAD",
          redirect: "follow",
          headers: {
            "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
          },
        })
        if (headRes.url && headRes.url !== rawUrl) {
          resolvedUrl = headRes.url
        }
      } catch (e) {
        console.warn("[fb-fetch-post] Redirect resolution failed, continuing with original URL:", e)
      }
    }

    // 3. Call Facebook Graph API oEmbed for posts
    // Endpoint: GET /oembed_post?url=<encoded_url>&access_token=<token>
    const oembedUrls = [
      activeToken
        ? `https://graph.facebook.com/v19.0/oembed_post?url=${encodeURIComponent(resolvedUrl)}&access_token=${encodeURIComponent(activeToken)}`
        : `https://graph.facebook.com/v19.0/oembed_post?url=${encodeURIComponent(resolvedUrl)}`,
      // Fallback with original URL if resolvedUrl differed
      resolvedUrl !== rawUrl && activeToken
        ? `https://graph.facebook.com/v19.0/oembed_post?url=${encodeURIComponent(rawUrl)}&access_token=${encodeURIComponent(activeToken)}`
        : null,
    ].filter(Boolean) as string[]

    let oembedData: any = null
    let oembedError: any = null

    for (const fetchUrl of oembedUrls) {
      try {
        const res = await fetch(fetchUrl, {
          headers: { "Accept": "application/json" },
          cache: "no-store",
        })
        const data = await res.json()
        if (data && data.html) {
          oembedData = data
          break
        } else if (data.error) {
          oembedError = data.error
        }
      } catch (err) {
        oembedError = err
      }
    }

    let externalPostId = extractFacebookPostId(resolvedUrl, oembedData?.html)
    let caption = ""
    let authorName = pageName || "Facebook Creator"
    let canonicalUrl = resolvedUrl
    let thumbnailUrl: string | null = null

    if (oembedData && oembedData.html) {
      const parsed = parseOembedHtml(oembedData.html)
      if (parsed.caption) caption = parsed.caption
      if (parsed.authorName) authorName = parsed.authorName
      if (parsed.canonicalUrl) canonicalUrl = parsed.canonicalUrl
      if (!externalPostId) {
        externalPostId = extractFacebookPostId(canonicalUrl, oembedData.html)
      }
      if (oembedData.author_name) {
        authorName = oembedData.author_name
      }
    }

    // 4. If we have a Page Access Token and an externalPostId, optionally enrich details from Graph API
    if (fbToken && externalPostId) {
      try {
        // Try querying full post object for picture and clean message
        // In Graph API: GET /{page_id}_{post_id}?fields=id,message,full_picture,permalink_url
        const candidateIds = [
          pageId ? `${pageId}_${externalPostId}` : null,
          externalPostId,
        ].filter(Boolean) as string[]

        for (const pid of candidateIds) {
          const detailRes = await fetch(
            `https://graph.facebook.com/v19.0/${pid}?fields=id,message,full_picture,permalink_url,from&access_token=${encodeURIComponent(fbToken)}`,
            { cache: "no-store" }
          )
          const detailData = await detailRes.json()
          if (detailData && detailData.id) {
            if (detailData.message) caption = detailData.message
            if (detailData.full_picture) thumbnailUrl = detailData.full_picture
            if (detailData.permalink_url) canonicalUrl = detailData.permalink_url
            if (detailData.from?.name) authorName = detailData.from.name
            externalPostId = detailData.id
            break
          }
        }
      } catch (err) {
        console.warn("[fb-fetch-post] Graph API detail fetch exception:", err)
      }
    }

    // If still no externalPostId could be resolved
    if (!externalPostId) {
      console.error("[fb-fetch-post] Resolution failed for URL:", { rawUrl, resolvedUrl, oembedError })
      const errorMsg = oembedError?.message || "Invalid or private Facebook post URL. Please make sure the post is public."
      return NextResponse.json({ error: errorMsg }, { status: 400 })
    }

    // 5. Store resolved post into platform_content table
    const postRecord = {
      account_id: account.id,
      platform: "facebook",
      external_post_id: String(externalPostId),
      permalink: canonicalUrl,
      caption: caption || "Facebook Post",
      thumbnail_url: thumbnailUrl,
      author_name: authorName,
      metadata: {
        raw_url: rawUrl,
        resolved_url: resolvedUrl,
        has_oembed: !!oembedData,
      },
      updated_at: new Date().toISOString(),
    }

    try {
      const { error: insertErr } = await supabase
        .from("platform_content")
        .upsert(postRecord, { onConflict: "account_id,platform,external_post_id" })

      if (insertErr) {
        console.warn("[fb-fetch-post] Notice: could not persist to platform_content (table may need migration):", insertErr.message)
      }
    } catch (dbErr) {
      console.warn("[fb-fetch-post] platform_content upsert skipped:", dbErr)
    }

    return NextResponse.json({
      success: true,
      post: {
        id: String(externalPostId),
        external_post_id: String(externalPostId),
        platform: "facebook",
        permalink: canonicalUrl,
        caption: caption || "Facebook Post",
        thumbnail_url: thumbnailUrl,
        author_name: authorName,
      },
    })
  } catch (error: any) {
    console.error("[fb-fetch-post] Server error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error resolving Facebook post" },
      { status: 500 }
    )
  }
}
