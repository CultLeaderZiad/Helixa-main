"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { BRAND } from "@/lib/brand"
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react"
import { ChannelBadge, type ChannelType } from "@/components/ui/ChannelBadge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

function ConnectPortalContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  // Telegram modal state
  const [tgModalOpen, setTgModalOpen] = useState(false)
  const [tgToken, setTgToken] = useState("")
  const [tgConnecting, setTgConnecting] = useState(false)

  // WhatsApp modal state
  const [waModalOpen, setWaModalOpen] = useState(false)
  const [waPhoneId, setWaPhoneId] = useState("")
  const [waAccessToken, setWaAccessToken] = useState("")
  const [waWabaId, setWaWabaId] = useState("")
  const [waConnecting, setWaConnecting] = useState(false)

  // Status map of connected platforms in this session
  const [connectedMap, setConnectedMap] = useState<Record<string, boolean>>({})

  // Connect Telegram bot
  const handleConnectTelegram = async () => {
    if (!tgToken.trim()) {
      toast.error("Please provide a valid bot token from @BotFather")
      return
    }
    setTgConnecting(true)
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: tgToken.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Telegram bot @${data.bot?.username || "bot"} connected successfully!`)
        setConnectedMap((prev) => ({ ...prev, telegram: true }))
        setTgModalOpen(false)
        setTgToken("")
      } else {
        toast.error(data.error || "Failed to connect Telegram bot")
      }
    } catch {
      toast.error("Network error connecting Telegram bot")
    } finally {
      setTgConnecting(false)
    }
  }

  // Connect WhatsApp
  const handleConnectWhatsApp = async () => {
    if (!waPhoneId.trim() || !waAccessToken.trim()) {
      toast.error("Please provide both Phone Number ID and System-User Access Token")
      return
    }
    setWaConnecting(true)
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number_id: waPhoneId.trim(),
          access_token: waAccessToken.trim(),
          waba_id: waWabaId.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success("WhatsApp Business connected successfully!")
        setConnectedMap((prev) => ({ ...prev, whatsapp: true }))
        setWaModalOpen(false)
      } else {
        toast.error(data.error || "Failed to connect WhatsApp")
      }
    } catch {
      toast.error("Network error connecting WhatsApp")
    } finally {
      setWaConnecting(false)
    }
  }

  const channels: {
    id: ChannelType
    name: string
    subtitle: string
    description: string
    actionText: string
    onAction: () => void
  }[] = [
    {
      id: "instagram",
      name: "Instagram",
      subtitle: "Professional / Creator Account",
      description: "Connect to automate Instagram direct messages, story mentions, and comment replies.",
      actionText: "Connect with Instagram",
      onAction: () => {
        window.location.href = "/api/instagram/auth"
      },
    },
    {
      id: "facebook",
      name: "Facebook & Messenger",
      subtitle: "Facebook Business Page",
      description: "Connect your Facebook Page to automate Messenger conversations and post comments.",
      actionText: "Connect Facebook Page",
      onAction: () => {
        window.location.href = "/api/facebook/auth"
      },
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      subtitle: "Cloud API & Verified Number",
      description: "Connect your WhatsApp Business number for instant 24/7 automated replies and lead capture.",
      actionText: "Connect WhatsApp",
      onAction: () => setWaModalOpen(true),
    },
    {
      id: "telegram",
      name: "Telegram Bot",
      subtitle: "Official BotFather Bot",
      description: "Connect your dedicated Telegram bot for instant messaging and broadcast updates.",
      actionText: "Connect Telegram Bot",
      onAction: () => setTgModalOpen(true),
    },
    {
      id: "tiktok",
      name: "TikTok Business",
      subtitle: "TikTok Creator / Business Account",
      description: "Connect your TikTok account for video comment replies and automated keyword DMs.",
      actionText: "Connect TikTok",
      onAction: () => {
        toast.info("Opening TikTok Business Account authorization...")
      },
    },
  ]

  return (
    <div className="min-h-screen bg-[#07080c] text-white flex flex-col justify-between selection:bg-[#c9974c]/20">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0d0e12]/80 backdrop-blur-md px-6 py-4 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#c9974c] to-[#e6ba68] flex items-center justify-center font-bold text-black text-sm">
              C
            </div>
            <div>
              <div className="font-semibold text-sm tracking-wide text-white">{BRAND.name}</div>
              <div className="text-[11px] text-neutral-400">Client Onboarding Portal</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure 72h Token Link</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-10 space-y-8">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#c9974c] bg-[#c9974c]/10 border border-[#c9974c]/20 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3 h-3" />
            <span>Fast & Private Setup</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Connect Your Channels
          </h1>
          <p className="text-neutral-400 text-sm max-w-2xl leading-relaxed">
            Authorize your official business accounts below. You log in directly with Meta or Telegram; your agency never sees or stores your personal passwords.
          </p>
        </div>

        {/* Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((channel) => {
            const isDone = connectedMap[channel.id]
            return (
              <div
                key={channel.id}
                className="rounded-2xl border border-white/10 bg-[#0e1017] p-5 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ChannelBadge channel={channel.id} size="md" />
                      <div>
                        <h3 className="text-sm font-semibold text-white">{channel.name}</h3>
                        <p className="text-[11px] text-neutral-400">{channel.subtitle}</p>
                      </div>
                    </div>
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-500 border border-white/5 bg-white/5 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {channel.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <Button
                    variant={isDone ? "secondary" : "default"}
                    size="sm"
                    onClick={channel.onAction}
                    className="w-full text-xs font-medium justify-between h-9"
                  >
                    <span>{isDone ? "Reconnect" : channel.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Security Notice */}
        <div className="rounded-xl border border-white/10 bg-[#0e1017]/50 p-4 flex items-center gap-3 text-xs text-neutral-400">
          <Lock className="w-4 h-4 text-neutral-400 shrink-0" />
          <span>
            OAuth tokens are encrypted at rest using AES-256-GCM. All permissions can be revoked at any time from your platform&apos;s security settings.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-6 text-center text-xs text-neutral-500">
        Powered by {BRAND.name} · {BRAND.tagline}
      </footer>

      {/* Telegram Connect Modal */}
      <Dialog open={tgModalOpen} onOpenChange={setTgModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#0e1017] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Connect Telegram Bot</DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Paste the HTTP API token provided by @BotFather on Telegram.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-neutral-300 block mb-1">Bot Token</label>
              <input
                type="password"
                value={tgToken}
                onChange={(e) => setTgToken(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-[#c9974c]"
              />
            </div>
            <p className="text-[11px] text-neutral-400">
              Open <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[#c9974c] underline">@BotFather</a> on Telegram, type <code className="bg-white/10 px-1 py-0.5 rounded text-[10px]">/newbot</code>, follow the prompts, and paste the API token here.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setTgModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleConnectTelegram} disabled={tgConnecting}>
              {tgConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Bot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Connect Modal */}
      <Dialog open={waModalOpen} onOpenChange={setWaModalOpen}>
        <DialogContent className="sm:max-w-md bg-[#0e1017] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Connect WhatsApp Business</DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Provide your Phone Number ID and Meta System-User Token.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-neutral-300 block mb-1">Phone Number ID</label>
              <input
                value={waPhoneId}
                onChange={(e) => setWaPhoneId(e.target.value)}
                placeholder="e.g. 102938475610293"
                className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-[#c9974c]"
              />
            </div>

            <div>
              <label className="text-neutral-300 block mb-1">System-User Access Token</label>
              <input
                type="password"
                value={waAccessToken}
                onChange={(e) => setWaAccessToken(e.target.value)}
                placeholder="EAAG..."
                className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-[#c9974c]"
              />
            </div>

            <div>
              <label className="text-neutral-300 block mb-1">WhatsApp Business Account ID (Optional)</label>
              <input
                value={waWabaId}
                onChange={(e) => setWaWabaId(e.target.value)}
                placeholder="e.g. 29384729384729"
                className="w-full h-9 bg-black/40 border border-white/10 rounded-lg px-3 text-xs text-white focus:outline-none focus:border-[#c9974c]"
              />
            </div>

            <div className="rounded-lg bg-black/30 border border-white/5 p-2.5 space-y-1 text-[11px] text-neutral-400">
              <div className="font-semibold text-neutral-300">How to find these in Meta:</div>
              <div>1. Go to <span className="text-[#c9974c]">developers.facebook.com</span> → Your App → WhatsApp → API Setup.</div>
              <div>2. Copy the Phone Number ID & WABA ID shown on the setup screen.</div>
              <div>3. In Business Settings → System Users, generate a token with <code className="text-neutral-200">whatsapp_business_messaging</code> permission.</div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setWaModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleConnectWhatsApp} disabled={waConnecting}>
              {waConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Connect WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PortalConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07080c] flex items-center justify-center text-white">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <ConnectPortalContent />
    </Suspense>
  )
}
