export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { unauthorizedCronResponse } from "@/lib/cron-auth"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { openAccessToken, sealAccessToken } from "@/lib/token-crypto"
import { refreshTikTokToken, tiktokTokenExpiry, tiktokTokenNeedsRefresh } from "@/lib/tiktok/oauth"

/**
 * GET /api/cron/refresh-tiktok-tokens
 * Access tokens last about a day. Refresh any TikTok row inside two hours of expiry.
 * Fails closed without CRON_SECRET. Skips cleanly before the phase 4 columns exist.
 */
export async function GET(request: NextRequest) {
  const denied = unauthorizedCronResponse(request)
  if (denied) return denied

  const supabase = await getSupabaseBypassClient()
  const { data, error } = await supabase
    .from("platform_connections")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("platform", "tiktok")
    .limit(200)
  if (error) {
    if (/refresh_token|token_expires_at|platform_connections/i.test(error.message || "")) {
      return NextResponse.json({ ok: true, skipped: "migration" })
    }
    console.error("[cron/refresh-tiktok-tokens]", error.message)
    return NextResponse.json({ error: "Failed to load TikTok connections" }, { status: 500 })
  }

  const summary = { scanned: (data || []).length, refreshed: 0, skipped: 0, errors: 0 }
  for (const row of data || []) {
    if (!row.refresh_token || !tiktokTokenNeedsRefresh(row.token_expires_at)) {
      summary.skipped++
      continue
    }
    let refresh = ""
    try {
      refresh = openAccessToken(row.refresh_token) || ""
    } catch {
      summary.errors++
      continue
    }
    if (!refresh) {
      summary.skipped++
      continue
    }
    const renewed = await refreshTikTokToken(refresh)
    if (!renewed.ok) {
      summary.errors++
      continue
    }
    const { error: updateError } = await supabase
      .from("platform_connections")
      .update({
        access_token: sealAccessToken(renewed.token.accessToken),
        refresh_token: renewed.token.refreshToken ? sealAccessToken(renewed.token.refreshToken) : row.refresh_token,
        token_expires_at: tiktokTokenExpiry(renewed.token.expiresIn),
      })
      .eq("id", row.id)
    if (updateError) summary.errors++
    else summary.refreshed++
  }
  return NextResponse.json({ ok: true, ...summary })
}
