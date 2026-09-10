export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import { getPostSentimentBreakdown } from "@/lib/sentiment-analyzer"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSessionUser(request)
    if (authResult.response) return authResult.response
    const { user: account, igUser } = authResult
    const igUserId = igUser?.id || account.id

    const supabase = await getSupabaseBypassClient()

    // 1. Fetch Facebook and explicitly resolved posts from platform_content
    const { data: platformRows, error: pErr } = await supabase
      .from("platform_content")
      .select("*")
      .eq("account_id", account.id)
      .order("created_at", { ascending: false })

    if (pErr) {
      console.warn("[recent-content] platform_content query notice:", pErr.message)
    }

    // 2. Fetch cached Instagram posts from media_cache
    let cachedIgPosts: any[] = []
    if (igUser) {
      const { data: mediaRows, error: mErr } = await supabase
        .from("media_cache")
        .select("*")
        .eq("user_id", igUser.id)
        .order("timestamp", { ascending: false })
        .limit(20)

      if (!mErr && mediaRows) {
        cachedIgPosts = mediaRows
      }
    }

    // 3. Fetch all automation_events for this account to compute real counts
    const { data: events, error: eErr } = await supabase
      .from("automation_events")
      .select("id, post_id, event_type, comment_id, metadata, platform, created_at")
      .eq("user_id", igUserId)

    if (eErr) {
      console.warn("[recent-content] automation_events query notice:", eErr.message)
    }

    // Index events by post ID
    const eventStats: Record<string, { commentsReceived: number; automationsTriggered: number; repliesSent: number }> = {}

    const trackEventForPost = (postId: string, eventType: string) => {
      if (!postId) return
      const cleanId = postId.includes("_") ? postId.split("_").pop()! : postId

      for (const key of [postId, cleanId]) {
        if (!eventStats[key]) {
          eventStats[key] = { commentsReceived: 0, automationsTriggered: 0, repliesSent: 0 }
        }
        if (eventType === "sent") {
          eventStats[key].repliesSent++
          eventStats[key].automationsTriggered++
        } else if (eventType === "comment_dm" || eventType === "comment") {
          eventStats[key].commentsReceived++
          eventStats[key].automationsTriggered++
        } else {
          eventStats[key].automationsTriggered++
        }
      }
    }

    for (const ev of events || []) {
      const pId = ev.post_id || ev.metadata?.post_id
      if (pId) {
        trackEventForPost(String(pId), ev.event_type)
      }
    }

    // 4. Unify posts into standardized structure
    const unifiedPosts: any[] = []
    const seenPostIds = new Set<string>()

    // Add posts from platform_content
    for (const p of platformRows || []) {
      const extId = String(p.external_post_id)
      seenPostIds.add(extId)
      if (extId.includes("_")) seenPostIds.add(extId.split("_").pop()!)

      const cleanId = extId.includes("_") ? extId.split("_").pop()! : extId
      const stats = eventStats[extId] || eventStats[cleanId] || { commentsReceived: 0, automationsTriggered: 0, repliesSent: 0 }
      const sentiment = await getPostSentimentBreakdown(supabase, extId)

      unifiedPosts.push({
        id: p.id,
        external_post_id: extId,
        platform: p.platform || "facebook",
        caption: p.caption || "Untitled Content",
        permalink: p.permalink,
        thumbnail_url: p.thumbnail_url,
        author_name: p.author_name || (p.platform === "facebook" ? "Facebook Creator" : "Instagram Creator"),
        created_at: p.created_at,
        activity: stats,
        sentiment,
      })
    }

    // Add posts from media_cache (Instagram) if not already included
    for (const m of cachedIgPosts) {
      const mediaId = String(m.media_id)
      if (seenPostIds.has(mediaId)) continue
      seenPostIds.add(mediaId)

      const stats = eventStats[mediaId] || { commentsReceived: 0, automationsTriggered: 0, repliesSent: 0 }
      const sentiment = await getPostSentimentBreakdown(supabase, mediaId)

      unifiedPosts.push({
        id: m.id,
        external_post_id: mediaId,
        platform: "instagram",
        caption: m.caption || "Instagram Reel / Post",
        permalink: m.permalink,
        thumbnail_url: m.image_url || m.video_url || null,
        author_name: igUser?.username || "Instagram Creator",
        created_at: m.timestamp || m.created_at,
        activity: stats,
        sentiment,
      })
    }

    return NextResponse.json({
      posts: unifiedPosts,
      totalPosts: unifiedPosts.length,
    })
  } catch (error: any) {
    console.error("[recent-content] API error:", error)
    return NextResponse.json({ error: error.message || "Failed to load recent content" }, { status: 500 })
  }
}
