"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import {
  AlertTriangle,
  Loader2,
  X,
  Check,
  ChevronRight,
  ArrowRight,
  Settings,
  Unplug,
  Link2,
  ExternalLink,
} from "lucide-react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import SpotlightCard from "@/components/ui/SpotlightCard"
import Link from "next/link"
import { toast } from "sonner"

declare global {
  interface Window {
    FB: any
    fbAsyncInit: () => void
  }
}

interface Connection {
  id: string
  platform: string
  page_id: string
  metadata?: any
  connected_at?: string
}

interface DiscoveredPage {
  id: string
  name: string
  category: string
}

const PLATFORMS = [
  {
    key: "instagram",
    name: "Instagram",
    description: "Comments, DMs & Stories",
    icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
    spotlightColor: "rgba(236, 72, 153, 0.15)",
    brandGradient: "from-purple-500 to-pink-500",
    brandBg: "bg-pink-500",
    brandText: "text-pink-400",
    brandBorder: "border-pink-500/20",
    platformFilter: (c: Connection) => c.platform === "instagram",
    connectType: "oauth" as const,
    locked: true,
  },
  {
    key: "facebook",
    name: "Facebook",
    description: "Comments & Messenger",
    icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    spotlightColor: "rgba(59, 130, 246, 0.15)",
    brandGradient: "from-blue-500 to-blue-600",
    brandBg: "bg-blue-500",
    brandText: "text-blue-400",
    brandBorder: "border-blue-500/20",
    platformFilter: (c: Connection) => c.platform === "facebook" || c.platform === "messenger",
    connectType: "fb-sdk" as const,
    locked: false,
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    description: "Business messaging",
    icon: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
    spotlightColor: "rgba(34, 197, 94, 0.15)",
    brandGradient: "from-green-500 to-green-600",
    brandBg: "bg-green-500",
    brandText: "text-green-400",
    brandBorder: "border-green-500/20",
    platformFilter: (c: Connection) => c.platform === "whatsapp",
    connectType: "manual" as const,
    locked: false,
  },
  {
    key: "telegram",
    name: "Telegram",
    description: "Bot automation",
    icon: "M17.894 6.844l-2.73 12.836c-.208.92-.75.114-1.127-.156l-3.12-2.302-1.503 1.448c-.166.167-.306.307-.63.307l.223-3.178 5.792-5.234c.252-.224-.055-.348-.39-.124L7.25 15.002 4.167 14.04c-.67-.21-1.077-.45-1.077-.922 0-.472 1.345-1.066 1.76-1.22l12.444-4.8c.582-.225 1.122-.053 1.25.132.128.185.114.58-.088 1.09l-1.084-2.822z",
    spotlightColor: "rgba(42, 171, 238, 0.15)",
    brandGradient: "from-cyan-400 to-cyan-500",
    brandBg: "bg-[#2AABEE]",
    brandText: "text-[#2AABEE]",
    brandBorder: "border-[#2AABEE]/20",
    platformFilter: (c: Connection) => c.platform === "telegram",
    connectType: "token" as const,
    locked: false,
  },
]

export default function ConnectedPlatformsPage() {
  const { t } = useLanguage()
  const {
    data: connectionsData,
    mutate: mutateConnections,
    isLoading: isConnectionsLoading,
    error: connectionsError,
  } = useSWR("/api/user/connections", fetcher)
  const connections: Connection[] = connectionsData?.connections || []
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Facebook SDK state
  const [fbSdkReady, setFbSdkReady] = useState(false)
  const [fbPages, setFbPages] = useState<DiscoveredPage[]>([])
  const [showPagePicker, setShowPagePicker] = useState(false)
  const [fbConnecting, setFbConnecting] = useState(false)
  const [fbDiscovering, setFbDiscovering] = useState(false)
  const [fbError, setFbError] = useState<string | null>(null)
  const [fbSessionId, setFbSessionId] = useState("")
  const [fbBusinessMode, setFbBusinessMode] = useState(false)
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)

  // Telegram state
  const [telegramToken, setTelegramToken] = useState("")
  const [telegramConnecting, setTelegramConnecting] = useState(false)
  const [telegramError, setTelegramError] = useState<string | null>(null)

  // Surface OAuth redirect results (?error= / ?success=) from the server-side
  // Facebook callback flow so users get actionable feedback instead of silence.
  const searchParams = useSearchParams()
  const [oauthNotice, setOauthNotice] = useState<{ type: "error" | "success"; message: string } | null>(null)
  useEffect(() => {
    const err = searchParams.get("error")
    const ok = searchParams.get("success")
    if (err) {
      const MESSAGES: Record<string, string> = {
        no_pages: "No Facebook Pages found on that account. You must manage at least one Facebook Page (personal profiles can't be connected).",
        token_failed: "Facebook token exchange failed. Please try connecting again.",
        connect_ig_first: "Please connect your Instagram account before adding Facebook Pages.",
        not_logged_in: "Your session expired. Please log in again and retry.",
        access_denied: "Facebook login was cancelled or permissions were declined.",
        server_error: "Something went wrong on our side while connecting. Please try again.",
      }
      setOauthNotice({ type: "error", message: MESSAGES[err] || `Facebook connection failed (${err}). Please try again.` })
    } else if (ok) {
      setOauthNotice({ type: "success", message: "Facebook Page connected successfully." })
      mutateConnections()
    }
    if (err || ok) {
      // Clean the URL so the banner doesn't reappear on refresh
      window.history.replaceState({}, "", "/dashboard/connected-platforms")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Load Facebook SDK
  useEffect(() => {
    // Fall back to the Instagram app id — both point at the same Meta app in
    // this project, and WITHOUT one of these vars the SDK never initialises
    // and the Connect button spins on "Loading..." forever (this is exactly
    // what happened in local dev where only NEXT_PUBLIC_INSTAGRAM_APP_ID is set).
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID
    if (!appId || window.FB) {
      if (window.FB) setFbSdkReady(true)
      return
    }
    window.fbAsyncInit = function () {
      // v20.0 was removed by Meta on 2026-09-24 — keep in sync with the
      // graph.facebook.com pins in app/api/facebook/**.
      window.FB.init({ appId, cookie: true, xfbml: false, version: "v25.0" })
      setFbSdkReady(true)
    }
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script")
      script.id = "facebook-jssdk"
      script.src = "https://connect.facebook.net/en_US/sdk.js"
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  const handleDelete = async (id: string, platform: string) => {
    if (platform === "instagram") {
      toast.error("Cannot disconnect primary Instagram account.")
      return
    }
    if (!confirm("Disconnect this account?")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/user/connections?id=${encodeURIComponent(id)}`, { method: "DELETE" })
      if (res.ok) mutateConnections()
    } finally {
      setDeletingId(null)
    }
  }

  // Facebook flows
  //
  // IMPORTANT: `business_management` is OFF by default. When included, Meta
  // forces the "Login for Business" dialog, which AUTO-CANCELS for any account
  // without a Meta Business Portfolio (i.e. most regular users). We only add
  // it when the user explicitly turns on Business Manager mode below, which is
  // how agency customers connect Business-Portfolio-managed Pages.
  const BASE_FB_SCOPE = "pages_manage_metadata,pages_messaging,pages_read_engagement,pages_show_list"

  const handleFacebookLogin = useCallback(() => {
    if (!window.FB) {
      setFbError("Facebook SDK not loaded yet. Please wait a moment and try again.")
      return
    }
    setFbError(null)
    setFbDiscovering(true)
    const scope = fbBusinessMode ? `${BASE_FB_SCOPE},business_management` : BASE_FB_SCOPE
    window.FB.login(
      (response: any) => {
        if (response.status === "connected" && response.authResponse?.accessToken) {
          discoverPages(response.authResponse.accessToken)
        } else {
          setFbDiscovering(false)
          setFbError(
            response.status === "not_authorized"
              ? "Authorization was not granted. Please approve the requested Page permissions to continue."
              : "Login was cancelled. No changes were made."
          )
        }
      },
      { scope, return_scopes: true, auth_type: "rerequest" }
    )
  }, [fbBusinessMode])

  const discoverPages = async (accessToken: string) => {
    try {
      const res = await fetch("/api/facebook/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      })
      const data = await res.json()
      if (!res.ok) { setFbError(data.error || "Failed to discover Pages."); setFbDiscovering(false); return }
      if (data.error === "no_pages" || !data.pages?.length) {
        setFbError("No Facebook Pages found on this account. You must be an admin or editor of at least one Facebook Page — personal profiles cannot be connected. Create one at facebook.com/pages/create, then try again.")
        setFbDiscovering(false)
        return
      }
      setFbPages(data.pages)
      setFbSessionId(data.session_id || "")
      setShowPagePicker(true)
    } catch { setFbError("Error discovering Pages.") }
    setFbDiscovering(false)
  }

  const connectPage = async (pageId: string) => {
    setSelectedPageId(pageId)
    setFbConnecting(true)
    setFbError(null)
    try {
      const res = await fetch("/api/facebook/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId, session_id: fbSessionId }),
      })
      const data = await res.json()
      if (!res.ok) { setFbError(data.error || "Failed to connect."); return }
      setShowPagePicker(false)
      setFbPages([])
      setFbSessionId("")
      mutateConnections()
    } catch { setFbError("Error connecting Page.") }
    setFbConnecting(false)
  }

  // Telegram flow
  const handleTelegramConnect = async () => {
    if (!telegramToken.trim()) { setTelegramError("Enter a bot token."); return }
    setTelegramConnecting(true)
    setTelegramError(null)
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: telegramToken.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setTelegramError(data.error || "Connection failed."); setTelegramConnecting(false); return }
      setTelegramToken("")
      mutateConnections()
      window.location.href = "/dashboard/platforms/telegram"
    } catch { setTelegramError("Error connecting.") }
    setTelegramConnecting(false)
  }

  return (
    <div className="p-4 md:p-8 max-w-[90rem] mx-auto space-y-8 pb-32">
      {/* Header */}
      <div>
        <h1 className="font-serif-display text-4xl text-white mb-2">{t.connectedPlatforms}</h1>
        <p className="text-neutral-400">Connect your social accounts to start automating.</p>
      </div>

      {/* OAuth redirect feedback (from /api/facebook/callback) */}
      {oauthNotice && (
        <div className={`rounded-xl p-4 flex items-start gap-3 border ${
          oauthNotice.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-red-500/10 border-red-500/20"
        }`}>
          {oauthNotice.type === "success"
            ? <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            : <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className={`text-sm ${oauthNotice.type === "success" ? "text-emerald-300" : "text-red-300"}`}>{oauthNotice.message}</p>
            {oauthNotice.type === "error" && (
              <p className="text-xs text-neutral-500 mt-1">
                Logged into the wrong Facebook account? Open{" "}
                <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">facebook.com</a>
                {" "}in another tab, log out there, then click Connect again — the popup will ask you to log in with the correct account.
              </p>
            )}
          </div>
          <button onClick={() => setOauthNotice(null)} className="text-neutral-500 hover:text-white p-0.5"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Error state */}
      {connectionsError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-400">Failed to load connections.</p>
            <p className="text-xs text-red-400/70 mt-1">{connectionsError.message}</p>
          </div>
          <button onClick={() => mutateConnections()} className="text-xs text-red-400 hover:text-red-300 underline">Retry</button>
        </div>
      )}

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {PLATFORMS.map((platform) => {
          const matchedConnections = connections.filter(platform.platformFilter)
          const isConnected = matchedConnections.length > 0

          return (
            <SpotlightCard
              key={platform.key}
              spotlightColor={platform.spotlightColor}
            >
              {/* Platform Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${platform.brandGradient} flex items-center justify-center shadow-lg`}>
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d={platform.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-[15px]">{platform.name}</h3>
                  <p className="text-neutral-500 text-xs">{platform.description}</p>
                </div>
              </div>

              {/* Connection Status */}
              <div className="mb-5 min-h-[60px]">
                {isConnectionsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-neutral-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking...</span>
                  </div>
                ) : connectionsError ? (
                  <div className="flex items-center gap-2 text-sm text-red-400 py-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Failed to check</span>
                  </div>
                ) : isConnected ? (
                  <div className="space-y-2">
                    {matchedConnections.map((c) => {
                      // Instagram uses an app-level webhook so it's live once connected.
                      // Facebook/Telegram connections store webhook_subscribed explicitly —
                      // if that's false the connection exists but events will NOT arrive,
                      // so we surface it instead of showing a misleading "Live" badge.
                      const webhookOk = c.platform === "instagram" || c.metadata?.webhook_subscribed !== false
                      return (
                      <div key={c.id} className="flex items-center justify-between bg-white/[0.04] px-3 py-2.5 rounded-xl border border-white/[0.06]">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-medium truncate">
                            {c.metadata?.username || c.metadata?.name || c.page_id}
                          </p>
                          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{c.platform}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {webhookOk ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                              <Check className="w-3 h-3" /> Live
                            </span>
                          ) : (
                            <span
                              className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                              title="This page is saved but Meta webhook subscription failed. Messages and comments will NOT be received. Try reconnecting the page."
                            >
                              <AlertTriangle className="w-3 h-3" /> No webhook
                            </span>
                          )}
                          {platform.key !== "instagram" && (
                            <button
                              onClick={() => handleDelete(c.id, c.platform)}
                              disabled={deletingId === c.id}
                              className="p-1 text-neutral-500 hover:text-red-400 transition-colors rounded-md hover:bg-red-400/10"
                            >
                              {deletingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-neutral-500 py-2">
                    <Link2 className="w-4 h-4" />
                    <span>Not connected</span>
                  </div>
                )}
              </div>

              {/* Platform-specific UI */}
              {platform.key === "facebook" && (
                <div className="space-y-3">
                  {fbError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400 flex-1">{fbError}</p>
                      <button onClick={() => setFbError(null)} className="text-red-400 hover:text-red-300 p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                  {showPagePicker && fbPages.length > 0 && (
                    <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white text-xs font-medium">Select a Page</h4>
                        <button onClick={() => { setShowPagePicker(false); setFbPages([]); setFbSessionId("") }} className="text-neutral-400 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      {fbPages.map((page) => {
                        const already = connections.some((c) => c.platform === "facebook" && c.page_id === page.id)
                        return (
                          <button
                            key={page.id}
                            onClick={() => !already && !fbConnecting && connectPage(page.id)}
                            disabled={already || fbConnecting}
                            className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                              already ? "border-green-500/20 bg-green-500/5" : "border-white/10 bg-white/[0.03] hover:border-blue-500/30 cursor-pointer"
                            }`}
                          >
                            <span className="text-white font-medium">{page.name}</span>
                            {already ? <Check className="w-3.5 h-3.5 text-green-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {/* Business Manager mode — for Pages managed through a Meta
                      Business Portfolio. OFF by default because the scope forces
                      Meta's "Login for Business" dialog that auto-cancels for
                      regular personal accounts. */}
                  <label className="flex items-start gap-2.5 cursor-pointer group px-1 select-none">
                    <input
                      type="checkbox"
                      checked={fbBusinessMode}
                      onChange={(e) => setFbBusinessMode(e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-[#e5a93c] cursor-pointer"
                    />
                    <span className="text-[11px] text-neutral-500 leading-snug group-hover:text-neutral-400 transition-colors">
                      My Pages are managed in <span className="text-neutral-300">Meta Business Manager</span>
                      <span className="block text-[10px] text-neutral-600 mt-0.5">Only enable if your Page lives inside a Business Portfolio (agencies/brands).</span>
                    </span>
                  </label>
                  <button
                    onClick={handleFacebookLogin}
                    disabled={fbDiscovering || !fbSdkReady}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {fbDiscovering ? <><Loader2 className="w-4 h-4 animate-spin" /> Discovering...</> : !fbSdkReady ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</> : isConnected ? "Add Another Page" : "Connect Facebook"}
                  </button>
                </div>
              )}

              {platform.key === "whatsapp" && (
                <div className="space-y-3">
                  <div className="bg-white/[0.03] border border-white/[0.08] text-neutral-300 p-3 rounded-xl text-xs leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      <span className="text-amber-400 font-medium">Coming soon.</span> WhatsApp Business
                      requires Meta-approved template messages and cannot be self-connected yet. Your
                      WhatsApp webhook endpoint is already live for when it's enabled.
                    </span>
                  </div>
                  <button disabled className="w-full py-2.5 bg-white/5 text-white/30 cursor-not-allowed rounded-xl text-sm font-medium border border-white/10">
                    Not available yet
                  </button>
                </div>
              )}

              {platform.key === "telegram" && (
                <div className="space-y-3">
                  {telegramError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400 flex-1">{telegramError}</p>
                      <button onClick={() => setTelegramError(null)} className="text-red-400 hover:text-red-300 p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Paste bot token..."
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#2AABEE]/50 placeholder-white/20 transition-colors"
                  />
                  <p className="text-[10px] text-neutral-500">
                    From <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[#2AABEE] hover:underline">@BotFather</a>
                  </p>
                  <button
                    onClick={handleTelegramConnect}
                    disabled={telegramConnecting || !telegramToken.trim()}
                    className="w-full py-2.5 bg-[#2AABEE] hover:bg-[#2AABEE]/90 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {telegramConnecting ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : isConnected ? "Add Another Bot" : "Connect Telegram"}
                  </button>
                </div>
              )}

              {platform.key === "instagram" && (
                isConnected ? (
                  <button disabled className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
                    Connected
                  </button>
                ) : (
                  <a
                    href="/api/instagram/auth"
                    className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:brightness-110 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    Connect Instagram
                  </a>
                )
              )}

              {/* Manage Link */}
              {isConnected && (
                <Link
                  href={`/dashboard/platforms/${platform.key}`}
                  className="mt-3 w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 border border-white/[0.06] group"
                >
                  <Settings className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition-colors" />
                  Manage {platform.name}
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>
              )}
            </SpotlightCard>
          )
        })}
      </div>
    </div>
  )
}
