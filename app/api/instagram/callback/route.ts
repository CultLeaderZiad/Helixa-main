import crypto from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient, getSupabaseBypassClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    const redirectUrl = new URL("/dashboard/connected-platforms", request.url)
    redirectUrl.searchParams.set("error", error)
    return NextResponse.redirect(redirectUrl)
  }

  if (code) {
    const redirectUrl = new URL("/dashboard/connected-platforms", request.url)
    redirectUrl.searchParams.set("code", code)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json({ error: "Invalid callback" }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body
    if (!code) return NextResponse.json({ error: "No code" }, { status: 400 })

    // 1. Env Vars
    const clientId = process.env.INSTAGRAM_APP_ID
    const clientSecret = process.env.INSTAGRAM_APP_SECRET
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "https://helixa-main-ecru.vercel.app"
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI || `${appUrl}/api/instagram/callback`

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing Env Vars: Check INSTAGRAM_APP_ID")
    }

    // 2. Exchange Code for Short Token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    })

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      if (tokenData.error_message?.includes("authorization code has been used")) {
        // Harmless double-fire from React StrictMode or double clicks
        return NextResponse.json({ error: "Code already used" }, { status: 400 })
      }
      console.error("[v0] 🔴 Token Error:", JSON.stringify(tokenData, null, 2))
      return NextResponse.json({ error: tokenData.error_description || "Token failed" }, { status: 400 })
    }

    const shortToken = tokenData.access_token
    const loginUserId = tokenData.user_id.toString()

    // 3. Exchange for Long Token (60 Days)
    const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortToken}`
    const longRes = await fetch(longLivedUrl)
    const longData = await longRes.json()
    const accessToken = longData.access_token || shortToken
    const expiresIn = longData.expires_in || 5184000

    // 4. Get Username + IG Professional Account ID (webhook-matching ID)
    // Per Meta docs: /me?fields=user_id returns the IG_ID that matches webhook entry.id
    // https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started
    let username = `user_${loginUserId}`
    let businessAccountId = loginUserId // fallback
    let profilePic: string | null = null

    try {
      const meRes = await fetch(
        `https://graph.instagram.com/v24.0/me?fields=user_id,username,profile_picture_url&access_token=${accessToken}`
      )
      const meData = await meRes.json()
      console.log("[v0] 📋 /me response:", JSON.stringify(meData))

      if (meData.username) username = meData.username
      if (meData.profile_picture_url) profilePic = meData.profile_picture_url
      if (meData.user_id) {
        businessAccountId = meData.user_id.toString()
        console.log(`[v0] 🎯 Got IG Professional Account ID (user_id): ${businessAccountId}`)
      } else {
        console.warn(`[v0] ⚠️ /me did not return user_id, using loginUserId: ${loginUserId}`)
      }
    } catch (e) {
      console.error("[v0] /me request failed:", e)
    }

    // 5. Save/Update User — check if new vs returning user
    // DB reads/writes go through the RLS-bypass client (the session client below
    // is used only for auth.getUser()).
    const db = await getSupabaseBypassClient()
    const supabase = await getSupabaseServerClient()

    // Check if user already exists (for conditional trial field setting)
    const { data: existingUser } = await db
      .from("users")
      .select("id")
      .eq("id", loginUserId)
      .single()

    // 5a. Get Supabase Auth User & Account
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: account } = await db
      .from("accounts")
      .select("id")
      .eq("id", authUser.id)
      .single()

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const updates: any = {
      username,
      access_token: accessToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      business_account_id: businessAccountId,
      page_id: businessAccountId, // Always keep in sync
      account_id: account.id,
    }

    // Only set signup_ip on FIRST login (new user)
    if (!existingUser) {
      const signupIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
        || request.headers.get("x-real-ip")
        || null

      updates.signup_ip = signupIp

      if (signupIp) {
        // IP-based signup rate limiting — flag but don't hard-block (agencies/shared offices)
        const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { count: ipSignupCount } = await db
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("signup_ip", signupIp)
          .gte("created_at", since24h)

        const IP_RATE_LIMIT = 5
        if ((ipSignupCount ?? 0) >= IP_RATE_LIMIT) {
          updates.is_flagged = true
          updates.flagged_reason = `Signup IP rate limit: ${ipSignupCount} accounts from ${signupIp} in 24h`
          console.warn(`[callback] 🚩 IP rate limit hit for ${signupIp} — flagging new user ${username}`)
        }

        // IPQualityScore (IPQS) Graceful Lookup
        const ipqsKey = process.env.IPQS_API_KEY
        if (ipqsKey) {
          try {
            const ipqsRes = await fetch(`https://www.ipqualityscore.com/api/json/ip/${ipqsKey}/${signupIp}?strictness=1`)
            if (ipqsRes.ok) {
              const ipqsData = await ipqsRes.json()
              if (ipqsData.success) {
                updates.ip_risk_score = ipqsData.fraud_score
                updates.vpn_suspected = ipqsData.vpn || ipqsData.proxy || ipqsData.tor
                
                // Flag if risk is high or VPN is used (flag-only, no block)
                if (ipqsData.fraud_score > 85 || updates.vpn_suspected) {
                  updates.is_flagged = true
                  updates.flagged_reason = updates.flagged_reason 
                    ? `${updates.flagged_reason} | High IP Risk (${ipqsData.fraud_score}) or VPN used`
                    : `High IP Risk (${ipqsData.fraud_score}) or VPN used`
                }
              }
            }
          } catch (err) {
            console.error("[callback] IPQS lookup failed:", err)
          }
        }
      }
    }

    console.log(`[v0] 💾 Saving user: ${username} | id=${loginUserId} | biz_id=${businessAccountId}`)

    const { error: upsertError } = await db
      .from("users")
      .upsert({ id: loginUserId, ...updates }, { onConflict: "id" })

    if (upsertError) throw upsertError

    // 6. Return response (no need for insta_session cookie, we use Supabase Auth now)
    const response = NextResponse.json({ success: true, username, userId: loginUserId, profilePic })
    return response

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
