"use client"

import React, { useState } from "react"
import {
  MessageSquare,
  Send,
  Radio,
  Share2,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check,
} from "lucide-react"
import { Pill } from "@/components/ui/Pill"
import { Button, HoldToConfirm } from "@/components/ui/button"
import { ChannelBadge } from "@/components/ui/ChannelBadge"
import { toast } from "sonner"

interface Connection {
  id: string
  platform: string
  page_id?: string
  metadata?: any
}

interface ChannelCardsProps {
  connections: Connection[]
  onConnectInstagram?: () => void
  onConnectFacebook?: () => void
  onConnectWhatsApp?: () => void
  onConnectTikTok?: () => void
  onConnectTelegram?: () => void
  onDisconnect?: (id: string) => void
}

export function ChannelCards({
  connections,
  onConnectInstagram,
  onConnectFacebook,
  onConnectWhatsApp,
  onConnectTikTok,
  onConnectTelegram,
  onDisconnect,
}: ChannelCardsProps) {
  const [copiedCode, setCopiedCode] = useState(false)

  const scriptCode = `<script src="https://cdn.helixa.app/w.js" data-id="nour_8f2"></script>`

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode)
    setCopiedCode(true)
    toast.success("Embed script copied to clipboard")
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 select-none">
      {/* 1. Instagram Card */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <ChannelBadge channel="instagram" size="sm" className="w-6 h-6 rounded-lg" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-[var(--t1)]">Instagram</h3>
                <p className="text-[11px] text-[var(--t3)]">Comments, DMs, stories</p>
              </div>
            </div>
            <Pill variant="green" dot>
              Live
            </Pill>
          </div>

          {/* Connected Account */}
          <div className="rounded-lg border border-[var(--line)] bg-[var(--s2)] p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center font-mono text-[10px] font-semibold text-[var(--t1)]">
                N
              </div>
              <span className="text-[12px] font-medium text-[var(--t1)]">
                @nour.cosmetics
              </span>
            </div>
            <span className="font-mono text-[11px] text-[var(--t3)] tabular-nums">
              48.2k
            </span>
          </div>

          {/* Token Health */}
          <div className="text-[11px] text-[var(--t3)] font-mono space-y-0.5 pt-0.5">
            <div>Last event 12s ago</div>
            <div>
              Token <span className="text-[var(--amber)]">expires in 6d</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.info("Refreshing Instagram long-lived access token")}
            className="h-[28px] px-2.5 text-[11.5px] font-medium gap-1 text-[var(--amber)] border-[var(--amber)]/30 hover:bg-[var(--amberbg)]"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reconnect now</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.info("Opening Instagram connection settings")}
            className="h-[28px] px-2.5 text-[11.5px] font-medium"
          >
            Manage
          </Button>
        </div>
      </div>

      {/* 2. Facebook & Messenger Card */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <ChannelBadge channel="facebook" size="sm" className="w-6 h-6 rounded-lg" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-[var(--t1)]">
                  Facebook & Messenger
                </h3>
                <p className="text-[11px] text-[var(--t3)]">Page comments and Messenger</p>
              </div>
            </div>
            <Pill variant="green" dot>
              Live
            </Pill>
          </div>

          {/* Connected Pages */}
          <div className="space-y-1.5">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--s2)] p-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center font-mono text-[9px] font-semibold text-[var(--t1)] shrink-0">
                  N
                </div>
                <span className="text-[11.5px] font-medium text-[var(--t1)] truncate">
                  Nour Cosmetics EG
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ChannelBadge channel="facebook" size="sm" className="w-3.5 h-3.5 rounded-full" />
                <ChannelBadge channel="messenger" size="sm" className="w-3.5 h-3.5 rounded-full" />
              </div>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--s2)] p-2 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center font-mono text-[9px] font-semibold text-[var(--t1)] shrink-0">
                  N
                </div>
                <span className="text-[11.5px] font-medium text-[var(--t1)] truncate">
                  Nour Cosmetics KSA
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <ChannelBadge channel="facebook" size="sm" className="w-3.5 h-3.5 rounded-full" />
                <ChannelBadge channel="messenger" size="sm" className="w-3.5 h-3.5 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
          <Button
            variant="secondary"
            size="sm"
            onClick={onConnectFacebook}
            className="h-[28px] px-2.5 text-[11.5px] font-medium gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add page</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.info("Managing Meta Business Manager pages")}
            className="h-[28px] px-2.5 text-[11.5px] font-medium"
          >
            Business Manager pages
          </Button>
        </div>
      </div>

      {/* 3. WhatsApp Business Card */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <ChannelBadge channel="whatsapp" size="sm" className="w-6 h-6 rounded-lg" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-[var(--t1)]">
                  WhatsApp Business
                </h3>
                <p className="text-[11px] text-[var(--t3)]">Cloud API · templates</p>
              </div>
            </div>
            <Pill variant="neutral" dot={false}>
              Not connected
            </Pill>
          </div>

          {/* Setup Options Grid */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg border border-[var(--line)] bg-[var(--s2)] p-2 space-y-1">
              <div className="font-semibold text-[var(--t1)]">Embedded Signup</div>
              <p className="text-[var(--t3)] leading-tight text-[10px]">
                Log in with Meta, pick or create a number. About 3 minutes.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--line)] bg-[var(--s2)] p-2 space-y-1">
              <div className="font-semibold text-[var(--t1)]">System-user token</div>
              <p className="text-[var(--t3)] leading-tight text-[10px]">
                For agencies that already manage the WABA in Business Manager.
              </p>
            </div>
          </div>

          {/* Stepper info */}
          <div className="font-mono text-[10px] text-[var(--t4)] flex items-center justify-between">
            <span>① Log in</span>
            <span>›</span>
            <span>② Number</span>
            <span>›</span>
            <span>③ Verify</span>
            <span>›</span>
            <span>④ Meta billing</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
          <Button
            variant="default"
            size="sm"
            onClick={onConnectWhatsApp}
            className="h-[28px] px-3 text-[11.5px] font-medium"
          >
            Connect WhatsApp
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.info("Opening Meta Cloud API requirements guide")}
            className="h-[28px] px-2.5 text-[11.5px] font-medium"
          >
            Requirements
          </Button>
        </div>
      </div>

      {/* 4. TikTok Card */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <ChannelBadge channel="tiktok" size="sm" className="w-6 h-6 rounded-lg" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-[var(--t1)]">TikTok</h3>
                <p className="text-[11px] text-[var(--t3)]">Comment replies, comment-to-DM</p>
              </div>
            </div>
            <Pill variant="blue" dot={false}>
              Beta
            </Pill>
          </div>

          {/* Region policy explanation */}
          <p className="text-[11.5px] text-[var(--t3)] leading-relaxed">
            Messaging depends on TikTok's regional approval. We check this account's region when you connect and show what's available.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
          <Button
            variant="default"
            size="sm"
            onClick={onConnectTikTok}
            className="h-[28px] px-3 text-[11.5px] font-medium"
          >
            Connect TikTok
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.info("MENA, Egypt & GCC are supported for TikTok DM/comment automation")}
            className="h-[28px] px-2.5 text-[11.5px] font-medium"
          >
            Region details
          </Button>
        </div>
      </div>

      {/* 5. Telegram Card */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <ChannelBadge channel="telegram" size="sm" className="w-6 h-6 rounded-lg" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-[var(--t1)]">Telegram</h3>
                <p className="text-[11px] text-[var(--t3)]">Bot DMs and channel broadcasts</p>
              </div>
            </div>
            <Pill variant="green" dot>
              Live
            </Pill>
          </div>

          {/* Connected Bot & HoldToConfirm Disconnect */}
          <div className="rounded-lg border border-[var(--line)] bg-[var(--s2)] p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center font-mono text-[10px] font-semibold text-[var(--t1)] shrink-0">
                B
              </div>
              <span className="text-[12px] font-medium text-[var(--t1)] truncate">
                @NourCosmeticsBot
              </span>
            </div>

            <HoldToConfirm
              label="Hold to disconnect"
              confirmingLabel="Disconnecting..."
              undoMessage="Telegram bot disconnected"
              onConfirm={() => {
                toast.success("Telegram bot disconnected successfully")
              }}
              className="h-[26px] px-2 text-[11px] shrink-0"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
          <Button
            variant="secondary"
            size="sm"
            onClick={onConnectTelegram}
            className="h-[28px] px-2.5 text-[11.5px] font-medium gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add bot</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open("https://t.me/BotFather", "_blank")}
            className="h-[28px] px-2.5 text-[11.5px] font-medium gap-1"
          >
            <span>Token from @BotFather</span>
            <ExternalLink className="w-3 h-3 text-[var(--t3)]" />
          </Button>
        </div>
      </div>

      {/* 6. Website Chat Card */}
      <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <ChannelBadge channel="webchat" size="sm" className="w-6 h-6 rounded-lg" />
              <div>
                <h3 className="text-[13.5px] font-semibold text-[var(--t1)]">Website chat</h3>
                <p className="text-[11px] text-[var(--t3)]">Widget for nourcosmetics.com</p>
              </div>
            </div>
            <Pill variant="green" dot>
              Live
            </Pill>
          </div>

          {/* Script Snippet Box */}
          <div className="rounded-lg border border-[var(--line)] bg-[var(--s2)] p-2 font-mono text-[10.5px] text-[var(--t2)] flex items-center justify-between gap-2 overflow-hidden">
            <code className="truncate max-w-[210px] text-[var(--t3)]">
              {scriptCode}
            </code>
            <button
              type="button"
              onClick={handleCopyScript}
              className="p-1 rounded-[4px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s3)] transition-colors cursor-pointer shrink-0"
              title="Copy embed script"
            >
              {copiedCode ? (
                <Check className="w-3 h-3 text-[var(--green)]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.info("Opening chat widget customizer")}
            className="h-[28px] px-2.5 text-[11.5px] font-medium"
          >
            Customize widget
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.info("Opening embed installation documentation")}
            className="h-[28px] px-2.5 text-[11.5px] font-medium"
          >
            Install guide
          </Button>
        </div>
      </div>
    </div>
  )
}
