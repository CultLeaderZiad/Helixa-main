"use client"

import { useState, useEffect, useCallback } from "react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { AlertTriangle, Plus, Loader2, X, Check, ChevronRight, ArrowRight, Settings } from "lucide-react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import SpotlightCard from "@/components/ui/SpotlightCard"
import Link from "next/link"

// Extend Window to include FB SDK types
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
    description: "Automate Instagram Comments and DMs",
    icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
    color: "pink",
    spotlightColor: "rgba(236, 72, 153, 0.08)",
    iconBg: "bg-pink-500/10",
    iconText: "text-pink-500",
    brandBtn: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
    platformFilter: (c: Connection) => c.platform === "instagram",
    connectType: "oauth" as const,
    locked: true, // Instagram is primary, can't add more
  },
  {
    key: "facebook",
    name: "Facebook",
    description: "Automate Facebook Comments and Messenger",
    icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    color: "blue",
    spotlightColor: "rgba(59, 130, 246, 0.08)",
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-500",
    brandBtn: "bg-blue-600 hover:bg-blue-700",
    platformFilter: (c: Connection) => c.platform === "facebook" || c.platform === "messenger",
    connectType: "fb-sdk" as const,
    locked: false,
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    description: "Automate WhatsApp Business",
    icon: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
    color: "green",
    spotlightColor: "rgba(34, 197, 94, 0.08)",
    iconBg: "bg-green-500/10",
    iconText: "text-green-500",
    brandBtn: "bg-green-600 hover:bg-green-700",
    platformFilter: (c: Connection) => c.platform === "whatsapp",
    connectType: "manual" as const,
    locked: false,
  },
  {
    key: "telegram",
    name: "Telegram",
    description: "Automate Telegram Bot messages",
    icon: "M17.894 6.844l-2.73 12.836c-.208.92-.75.114-1.127-.156l-3.12-2.302-1.503 1.448c-.166.167-.306.307-.63.307l.223-3.178 5.792-5.234c.252-.224-.055-.348-.39-.124L7.25 15.002 4.167 14.04c-.67-.21-1.077-.45-1.077-.922 0-.472 1.345-1.066 1.76-1.22l12.444-4.8c.582-.225 1.122-.053 1.25.132.128.185.114.58-.088 1.09l-1.084-2.822z",
    color: "cyan",
    spotlightColor: "rgba(42, 171, 238, 0.08)",
    iconBg: "bg-[#2AABEE]/10",
    iconText: "text-[#2AABEE]",
    brandBtn: "bg-[#2AABEE] hover:bg-[#2AABEE]/90",
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

  // Facebook SDK popup flow state
  const [fbSdkReady, setFbSdkReady] = useState(false)
  const [fbPages, setFbPages] = useState<DiscoveredPage[]>([])
  const [showPagePicker, setShowPagePicker] = useState(false)
  const [fbConnecting, setFbConnecting] = useState(false)
  const [fbDiscovering, setFbDiscovering] = useState(false)
  const [fbError, setFbError] = useState<string | null>(null)
  const [fbToken, setFbToken] = useState<string>("")
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)

  // Telegram flow state
  const [telegramToken, setTelegramToken] = useState("")
  const [telegramConnecting, setTelegramConnecting] = useState(false)
  const [telegramError, setTelegramError] = useState<string | null>(null)

  // Load Facebook SDK
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID

    if (!appId) {
      console.warn("[FB SDK] NEXT_PUBLIC_FACEBOOK_APP_ID not set, Facebook connect will be disabled")
      return
    }

    if (window.FB) {
      setFbSdkReady(true)
      return
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: appId,
        cookie: true,
        xfbml: false,
        version: "v20.0",
      })
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
      alert("Cannot disconnect primary Instagram account from this page.")
      return
    }

    if (!confirm("Are you sure you want to disconnect this account?")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/user/connections?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (res.ok) {
        mutateConnections()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to disconnect")
      }
    } catch (error) {
      console.error("Failed to disconnect:", error)
    } finally {
      setDeletingId(null)
    }
  }

  // ── Facebook SDK Popup Flow ──────────────────────────────────────

  const handleFacebookLogin = useCallback(() => {
    if (!window.FB) {
      setFbError("Facebook SDK not loaded. Please refresh the page and try again.")
      return
    }

    setFbError(null)
    setFbDiscovering(true)

    window.FB.login(
      (response: any) => {
        if (response.status === "connected" && response.authResponse?.accessToken) {
          discoverPages(response.authResponse.accessToken)
        } else {
          setFbDiscovering(false)
          if (response.status === "not_authorized") {
            setFbError("You need to authorize Helixa to access your Facebook Pages.")
          } else {
            setFbError("Facebook login was cancelled.")
          }
        }
      },
      {
        scope: "pages_manage_metadata,pages_messaging,pages_read_engagement,pages_show_list,business_management",
        return_scopes: true,
      }
    )
  }, [])

  const discoverPages = async (accessToken: string) => {
    try {
      const res = await fetch("/api/facebook/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFbError(data.error || "Failed to discover Facebook Pages.")
        setFbDiscovering(false)
        return
      }

      if (!data.pages || data.pages.length === 0) {
        setFbError("No Facebook Pages found. Make sure you manage at least one Facebook Page.")
        setFbDiscovering(false)
        return
      }

      setFbPages(data.pages)
      setFbToken(data._token || "")
      setShowPagePicker(true)
      setFbDiscovering(false)
    } catch (error) {
      setFbError("An error occurred while discovering your Facebook Pages.")
      setFbDiscovering(false)
    }
  }

  const connectPage = async (pageId: string) => {
    setSelectedPageId(pageId)
    setFbConnecting(true)
    setFbError(null)

    try {
      const res = await fetch("/api/facebook/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId, _token: fbToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        setFbError(data.error || "Failed to connect the Page.")
        return
      }

      setShowPagePicker(false)
      setFbPages([])
      setFbToken("")
      setSelectedPageId(null)
      mutateConnections()
    } catch (error) {
      setFbError("An error occurred while connecting the Page.")
    } finally {
      setFbConnecting(false)
    }
  }

  const closePagePicker = () => {
    setShowPagePicker(false)
    setFbPages([])
    setFbToken("")
    setSelectedPageId(null)
    setFbError(null)
  }

  // ── Telegram Token Flow ─────────────────────────────────────────

  const handleTelegramConnect = async () => {
    if (!telegramToken.trim()) {
      setTelegramError("Please enter a bot token.")
      return
    }

    setTelegramConnecting(true)
    setTelegramError(null)

    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: telegramToken.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setTelegramError(data.error || "Failed to connect Telegram Bot.")
        setTelegramConnecting(false)
        return
      }

      setTelegramToken("")
      setTelegramConnecting(false)
      mutateConnections()
      // Redirect to Telegram dashboard after successful connection
      window.location.href = "/dashboard/platforms/telegram"
    } catch (error) {
      setTelegramError("An error occurred while connecting.")
      setTelegramConnecting(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[90rem] mx-auto space-y-8 pb-32">
      <div>
        <h1 className="font-serif-display text-4xl text-white mb-2">{t.connectedPlatforms}</h1>
        <p className="text-muted-foreground">Connect your social accounts to start automating.</p>
      </div>

      {/* Error state */}
      {connectionsError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm text-red-400">Failed to load connections.</p>
            <p className="text-xs text-red-400/70 mt-1">{connectionsError.message}</p>
          </div>
          <button onClick={() => mutateConnections()} className="ml-auto text-xs text-red-400 hover:text-red-300 underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {PLATFORMS.map((platform) => {
          const matchedConnections = connections.filter(platform.platformFilter)
          const isConnected = matchedConnections.length > 0
          const isLoading = isConnectionsLoading

          return (
            <SpotlightCard
              key={platform.key}
              spotlightColor={platform.spotlightColor}
              className="rounded-2xl"
            >
              <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${platform.iconBg} flex items-center justify-center ${platform.iconText}`}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path d={platform.icon} />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{platform.name}</h3>
                      <p className="text-xs text-muted-foreground">{platform.description}</p>
                    </div>
                  </div>
                </div>

                {/* Connection Status */}
                <div className="space-y-3 mb-6 flex-1">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking connection...
                    </div>
                  ) : connectionsError ? (
                    <div className="flex items-center gap-2 text-sm text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      Failed to check
                    </div>
                  ) : isConnected ? (
                    matchedConnections.map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="min-w-0">
                          <div className="text-sm text-white font-medium truncate">
                            {c.metadata?.username || c.metadata?.name || c.page_id}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.platform}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Connected
                          </div>
                          {platform.key !== "instagram" && (
                            <button
                              onClick={() => handleDelete(c.id, c.platform)}
                              disabled={deletingId === c.id}
                              className="text-red-400 hover:text-red-300 transition-colors p-1"
                              title="Disconnect"
                            >
                              {deletingId === c.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-neutral-500">
                      No {platform.name} accounts connected.
                    </div>
                  )}
                </div>

                {/* Platform-specific connect UI */}
                {platform.key === "facebook" && (
                  <>
                    {fbError && (
                      <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400 leading-relaxed flex-1">{fbError}</p>
                        <button onClick={() => setFbError(null)} className="text-red-400 hover:text-red-300 p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {showPagePicker && fbPages.length > 0 && (
                      <div className="mb-3 border border-blue-500/20 bg-blue-500/5 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium text-sm">Select a Page</h4>
                          <button onClick={closePagePicker} className="text-neutral-400 hover:text-white p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {fbPages.map((page) => {
                            const already = connections.some((c) => c.platform === "facebook" && c.page_id === page.id)
                            const connecting = fbConnecting && selectedPageId === page.id
                            return (
                              <button
                                key={page.id}
                                onClick={() => !already && !fbConnecting && connectPage(page.id)}
                                disabled={already || fbConnecting}
                                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                                  already
                                    ? "border-green-500/20 bg-green-500/5 cursor-default"
                                    : connecting
                                      ? "border-blue-500/30 bg-blue-500/10"
                                      : "border-white/10 bg-white/[0.03] hover:border-blue-500/30 hover:bg-blue-500/5 cursor-pointer"
                                } ${fbConnecting && !connecting ? "opacity-50" : ""}`}
                              >
                                <div>
                                  <div className="text-sm text-white font-medium">{page.name}</div>
                                  <div className="text-[10px] text-neutral-500">{page.category}</div>
                                </div>
                                {already ? (
                                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Connected
                                  </span>
                                ) : connecting ? (
                                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-neutral-500" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleFacebookLogin}
                      disabled={fbDiscovering || !fbSdkReady}
                      className={`w-full py-2 ${platform.brandBtn} text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                    >
                      {fbDiscovering ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Discovering Pages...
                        </>
                      ) : !fbSdkReady ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading Facebook...
                        </>
                      ) : isConnected ? (
                        "Add Another Page"
                      ) : (
                        "Connect Facebook Page"
                      )}
                    </button>
                  </>
                )}

                {platform.key === "whatsapp" && (
                  <>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500/90 p-3 rounded-lg flex items-start gap-2 mb-3 text-xs leading-relaxed">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Manual Setup Required:</strong> WhatsApp requires pre-approved template messages via Meta Business Manager.
                      </div>
                    </div>
                    <button disabled className="w-full py-2 bg-white/5 text-white/50 cursor-not-allowed rounded-lg text-sm font-medium border border-white/10">
                      Configure via Meta App Dashboard
                    </button>
                  </>
                )}

                {platform.key === "telegram" && (
                  <div className="space-y-3">
                    {telegramError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400 leading-relaxed flex-1">{telegramError}</p>
                        <button onClick={() => setTelegramError(null)} className="text-red-400 hover:text-red-300 p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="Paste your bot token here..."
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 placeholder-white/30"
                    />
                    <p className="text-[10px] text-neutral-500">
                      Get your bot token from{" "}
                      <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-[#2AABEE] hover:underline">
                        @BotFather
                      </a>{" "}
                      on Telegram.
                    </p>
                    <button
                      onClick={handleTelegramConnect}
                      disabled={telegramConnecting || !telegramToken.trim()}
                      className={`w-full py-2 ${platform.brandBtn} text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
                    >
                      {telegramConnecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Connecting...
                        </>
                      ) : isConnected ? (
                        "Add Another Bot"
                      ) : (
                        "Connect Telegram Bot"
                      )}
                    </button>
                  </div>
                )}

                {platform.key === "instagram" && (
                  <button
                    disabled
                    className={`w-full py-2 ${platform.brandBtn} text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50`}
                  >
                    {isConnected ? "Connected" : "Connect Instagram"}
                  </button>
                )}

                {/* Manage link for connected platforms */}
                {isConnected && platform.key !== "instagram" && (
                  <Link
                    href={`/dashboard/platforms/${platform.key}`}
                    className="mt-3 w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-white/10"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Manage {platform.name}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {isConnected && platform.key === "instagram" && (
                  <Link
                    href="/dashboard/platforms/instagram"
                    className="mt-3 w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-white/10"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Manage Instagram
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </SpotlightCard>
          )
        })}
      </div>
    </div>
  )
}
