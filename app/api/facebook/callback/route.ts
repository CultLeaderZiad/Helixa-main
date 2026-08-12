import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { getSessionUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    const redirectUrl = new URL("/dashboard/connected-platforms?error=" + encodeURIComponent(error), request.url)
    return NextResponse.redirect(redirectUrl)
  }

  if (!code) {
    return NextResponse.json({ error: "Invalid callback" }, { status: 400 })
  }

  // Get current user session (returns account)
  const account = await getSessionUser(request)
  if (!account) {
    return NextResponse.redirect(new URL("/?error=not_logged_in", request.url))
  }

  const supabase = await getSupabaseBypassClient()

  // Get the linked users row (Instagram profile)
  const { data: userProfile } = await supabase.from("users").select("id").eq("account_id", account.id).single()
  if (!userProfile) {
    return NextResponse.redirect(new URL("/dashboard/connected-platforms?error=connect_ig_first", request.url))
  }

  // IPQualityScore (IPQS) Graceful Lookup
  const ipqsKey = process.env.IPQS_API_KEY
  if (ipqsKey) {
    const signupIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || request.headers.get("x-real-ip")
    if (signupIp) {
      try {
        const ipqsRes = await fetch(`https://www.ipqualityscore.com/api/json/ip/${ipqsKey}/${signupIp}?strictness=1`)
        if (ipqsRes.ok) {
          const ipqsData = await ipqsRes.json()
          if (ipqsData.success) {
            const isVpn = ipqsData.vpn || ipqsData.proxy || ipqsData.tor
            const updates: any = {
              ip_risk_score: ipqsData.fraud_score,
              vpn_suspected: isVpn,
            }
            if (ipqsData.fraud_score > 85 || isVpn) {
              updates.is_flagged = true
              updates.flagged_reason = `High IP Risk on FB connect (${ipqsData.fraud_score}) or VPN used`
            }
            await supabase.from("users").update(updates).eq("id", userProfile.id)
          }
        }
      } catch (err) {
        console.error("[callback] FB IPQS lookup failed:", err)
      }
    }
  }

  // Trial limit check: max 1 platform connection (which is usually their IG)
  const { data: userDetails } = await supabase.from("users").select("plan").eq("id", userProfile.id).single()
  if (userDetails?.plan === "trial") {
    // We allow connecting Facebook pages because it's required to automate Instagram.
    // We will enforce the 1 platform limit at the automation rules level, not the connection level.
    console.log("[FB Callback] Trial user connecting Facebook - allowed because it's required for IG automation.")
  }

  const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
  const clientSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const redirectUri = process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI || `${appUrl}/api/facebook/callback`

  if (!clientId || !clientSecret || !redirectUri) {
    console.error("[FB Callback] Missing configuration: App ID, Secret, or Redirect URI is not set.")
    return NextResponse.json({ error: "Missing Facebook configuration in environment variables." }, { status: 500 })
  }

  try {
    // 1. Exchange Code for short token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    })

    const tokenRes = await fetch("https://graph.facebook.com/v20.0/oauth/access_token?" + tokenParams.toString())
    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL("/dashboard/connected-platforms?error=token_failed", request.url))
    }

    const shortToken = tokenData.access_token

    // 2. Exchange for long token (60 Days)
    const longLivedUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortToken}`
    const longRes = await fetch(longLivedUrl)
    const longData = await longRes.json()
    const accessToken = longData.access_token || shortToken

    // 3. Get Pages (Accounts) user manages
    const accountsRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${accessToken}`)
    const accountsData = await accountsRes.json()

    if (!accountsData.data || accountsData.data.length === 0) {
      return NextResponse.redirect(new URL("/dashboard/connected-platforms?error=no_pages", request.url))
    }

    // 4. Save to platform_connections
    // We will save each page. Note that pages_messaging requires page access token, which is returned in /me/accounts
    for (const page of accountsData.data) {
      const pageAccessToken = page.access_token
      const pageId = page.id
      
      await supabase.from("platform_connections").upsert({
        user_id: userProfile.id,
        platform: "facebook",
        page_id: pageId,
        access_token: pageAccessToken,
        metadata: { name: page.name, category: page.category }
      }, { onConflict: 'user_id, platform, page_id' })

      await supabase.from("platform_connections").upsert({
        user_id: userProfile.id,
        platform: "messenger",
        page_id: pageId,
        access_token: pageAccessToken,
        metadata: { name: page.name, category: page.category }
      }, { onConflict: 'user_id, platform, page_id' })
    }

    return NextResponse.redirect(new URL("/dashboard/connected-platforms?success=1", request.url))
  } catch (error) {
    console.error("Facebook auth error:", error)
    return NextResponse.redirect(new URL("/dashboard/connected-platforms?error=server_error", request.url))
  }
}
