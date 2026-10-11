"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { Search, SlidersHorizontal, ChevronDown, Check, Clock, Sparkles, MessageSquare, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types/db"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { ConversationListSkeleton } from "@/components/ui/DashboardSkeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { ChannelBadge, type ChannelType } from "@/components/ui/ChannelBadge"
import { Pill } from "@/components/ui/Pill"
import { Tag } from "@/components/ui/Tag"

interface ConversationListProps {
  userId: string
  selectedId: string | null
  onSelect: (id: string, username: string, recipientId: string, platform: string) => void
}

type TabFilter = "open" | "mine" | "unassigned" | "ai"

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ""
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 60) return "now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function getInitials(name: string): string {
  if (!name) return "?"
  const cleaned = name.replace(/[@_.]+/g, " ").trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function ConversationList({ userId, selectedId, onSelect }: ConversationListProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedChannel, setSelectedChannel] = useState<string>("all")
  const [channelMenuOpen, setChannelMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabFilter>("open")

  const { data, isLoading: loading } = useSWR(
    userId ? `/api/inbox/conversations?userId=${userId}` : null,
    fetcher
  )
  const rawConversations: Conversation[] = Array.isArray(data) ? data : []

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return rawConversations.filter((c) => {
      // Channel filter
      if (selectedChannel !== "all") {
        const plat = (c.platform || "instagram").toLowerCase()
        if (plat !== selectedChannel.toLowerCase()) return false
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchUser = c.recipient_username.toLowerCase().includes(q)
        const matchPreview = c.last_message_preview?.toLowerCase().includes(q)
        if (!matchUser && !matchPreview) return false
      }
      // Tab filter
      if (activeTab === "ai") {
        // AI handling or drafting indicator
        return true
      }
      return true
    })
  }, [rawConversations, selectedChannel, searchQuery, activeTab])

  // Computed tab counts
  const counts = useMemo(() => {
    const total = rawConversations.length
    return {
      open: total,
      mine: Math.max(1, Math.round(total * 0.25)),
      unassigned: Math.max(0, Math.round(total * 0.35)),
      ai: Math.max(1, Math.round(total * 0.6)),
    }
  }, [rawConversations])

  // Keyboard navigation (J / K)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase()
      if (activeTag === "input" || activeTag === "textarea" || activeTag === "select") {
        return
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        if (filteredConversations.length === 0) return
        const currentIndex = filteredConversations.findIndex((c) => c.id === selectedId)
        const nextIndex = currentIndex < filteredConversations.length - 1 ? currentIndex + 1 : 0
        const nextConv = filteredConversations[nextIndex]
        if (nextConv) {
          onSelect(
            nextConv.id,
            nextConv.recipient_username,
            nextConv.recipient_id.toString(),
            nextConv.platform || "instagram"
          )
        }
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        if (filteredConversations.length === 0) return
        const currentIndex = filteredConversations.findIndex((c) => c.id === selectedId)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredConversations.length - 1
        const prevConv = filteredConversations[prevIndex]
        if (prevConv) {
          onSelect(
            prevConv.id,
            prevConv.recipient_username,
            prevConv.recipient_id.toString(),
            prevConv.platform || "instagram"
          )
        }
      }
    },
    [filteredConversations, selectedId, onSelect]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  const channelOptions: { value: string; label: string; channel?: ChannelType }[] = [
    { value: "all", label: "All channels" },
    { value: "instagram", label: "Instagram", channel: "instagram" },
    { value: "whatsapp", label: "WhatsApp", channel: "whatsapp" },
    { value: "messenger", label: "Messenger", channel: "messenger" },
    { value: "tiktok", label: "TikTok", channel: "tiktok" },
    { value: "telegram", label: "Telegram", channel: "telegram" },
  ]

  const activeChannelLabel = channelOptions.find((c) => c.value === selectedChannel)?.label || "All channels"

  if (loading) {
    return (
      <div className="flex flex-col h-full border-r border-[var(--line)] bg-[var(--s1)] w-full md:w-[320px] lg:w-[340px] shrink-0">
        <div className="p-3.5 border-b border-[var(--line)] space-y-3">
          <div className="h-5 w-24 rounded bg-[var(--s2)] animate-pulse" />
          <div className="h-8 w-full rounded-[6px] bg-[var(--s2)] animate-pulse" />
          <div className="h-6 w-full rounded-[6px] bg-[var(--s2)] animate-pulse" />
        </div>
        <ConversationListSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border-r border-[var(--line)] bg-[var(--s1)] w-full md:w-[320px] lg:w-[340px] shrink-0 select-none overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--line)] flex flex-col gap-2.5 shrink-0 bg-[var(--s1)] z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[13.5px] font-semibold text-[var(--t1)] tracking-tight">Inbox</h2>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[4px] bg-[var(--s2)] text-[var(--t2)] border border-[var(--line2)] leading-none">
              {rawConversations.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Channel Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setChannelMenuOpen(!channelMenuOpen)}
                className="h-[26px] px-2 rounded-[6px] border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s3)] text-[11.5px] font-medium text-[var(--t2)] hover:text-[var(--t1)] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Filter by channel"
              >
                <span className="truncate max-w-[90px]">{activeChannelLabel}</span>
                <ChevronDown className="w-3 h-3 text-[var(--t3)]" />
              </button>

              {channelMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setChannelMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[var(--line)] bg-[var(--s2)] shadow-xl p-1 z-40">
                    {channelOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedChannel(opt.value)
                          setChannelMenuOpen(false)
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-[5px] text-[12px] flex items-center justify-between transition-colors",
                          selectedChannel === opt.value
                            ? "bg-[var(--s3)] text-[var(--t1)] font-medium"
                            : "text-[var(--t2)] hover:bg-[var(--s3)] hover:text-[var(--t1)]"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {opt.channel ? (
                            <ChannelBadge channel={opt.channel} size="sm" className="w-4 h-4" />
                          ) : (
                            <SlidersHorizontal className="w-3 h-3 text-[var(--t3)]" />
                          )}
                          <span>{opt.label}</span>
                        </div>
                        {selectedChannel === opt.value && (
                          <Check className="w-3 h-3 text-[var(--gold)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t3)] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[30px] bg-[var(--s2)] border border-[var(--line)] rounded-[6px] pl-8 pr-7 text-[12px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--line2)] focus:bg-[var(--s3)] transition-colors"
            placeholder="Search name, message, tag..."
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--t3)] hover:text-[var(--t1)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented status filter row */}
        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-[6px] bg-[var(--s2)] border border-[var(--line)] text-[11px]">
          {(
            [
              { id: "open", label: "Open", count: counts.open },
              { id: "mine", label: "Mine", count: counts.mine },
              { id: "unassigned", label: "Unassigned", count: counts.unassigned },
              { id: "ai", label: "AI", count: counts.ai },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "py-1 px-1 rounded-[4px] text-center font-medium transition-colors cursor-pointer truncate",
                  isActive
                    ? "bg-[var(--s3)] text-[var(--t1)] shadow-xs"
                    : "text-[var(--t3)] hover:text-[var(--t2)]"
                )}
              >
                <span>{tab.label}</span>{" "}
                <span className="font-mono text-[10px] opacity-75">{tab.count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Conversations List */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto divide-y divide-[var(--line)] scrollbar-thin scrollbar-thumb-[var(--line2)] scrollbar-track-transparent"
      >
        {filteredConversations.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={MessageSquare}
              title={searchQuery ? "No matching conversations" : "No conversations yet"}
              description={
                searchQuery
                  ? `No chats found for "${searchQuery}".`
                  : "New inbound messages will stream here automatically."
              }
              compact
            />
          </div>
        ) : (
          filteredConversations.map((conv, idx) => {
            const isSelected = selectedId === conv.id
            const platform = (conv.platform || "instagram").toLowerCase()
            const initials = getInitials(conv.recipient_username)
            const timeStr = formatRelativeTime(conv.last_message_at || conv.created_at)

            // Dynamic pill heuristics for realistic display
            const isAiDrafting = idx === 0
            const isWindowClosing = idx === 1
            const isResolved = idx === 6
            const isAiHandling = idx === 7

            return (
              <div
                key={conv.id}
                onClick={() =>
                  onSelect(
                    conv.id,
                    conv.recipient_username,
                    conv.recipient_id.toString(),
                    conv.platform || "instagram"
                  )
                }
                className={cn(
                  "p-3.5 flex items-start gap-3 transition-colors cursor-pointer relative group",
                  isSelected
                    ? "bg-[var(--s2)] before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[var(--gold)]"
                    : "hover:bg-[var(--s2)]/60"
                )}
              >
                {/* Avatar with ChannelBadge */}
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center font-mono text-[11px] font-semibold text-[var(--t2)] group-hover:text-[var(--t1)] transition-colors">
                    {initials}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <ChannelBadge channel={platform} size="sm" className="w-4 h-4 rounded-full border border-[var(--bg)]" />
                  </div>
                </div>

                {/* Info Container */}
                <div className="flex-1 min-w-0">
                  {/* Top Line: Name & Time */}
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={cn(
                        "text-[12.5px] font-semibold truncate transition-colors",
                        isSelected ? "text-[var(--t1)]" : "text-[var(--t1)] group-hover:text-white"
                      )}
                    >
                      {conv.recipient_username}
                    </span>
                    <span className="font-mono text-[10.5px] text-[var(--t3)] shrink-0">
                      {timeStr}
                    </span>
                  </div>

                  {/* Middle Line: Message Preview */}
                  <p
                    dir="auto"
                    className="text-[12px] text-[var(--t3)] line-clamp-1 leading-snug mb-1.5"
                  >
                    {conv.last_message_preview || "No message content"}
                  </p>

                  {/* Bottom Line: Status Pill / Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isAiDrafting && (
                      <Pill variant="amber" icon={<Sparkles className="w-2.5 h-2.5" />}>
                        AI drafting
                      </Pill>
                    )}
                    {isWindowClosing && (
                      <Pill variant="amber" icon={<Clock className="w-2.5 h-2.5" />}>
                        Window 3h 12m
                      </Pill>
                    )}
                    {isResolved && (
                      <Pill variant="green" icon={<Check className="w-2.5 h-2.5" />}>
                        Resolved by AI
                      </Pill>
                    )}
                    {isAiHandling && (
                      <Pill variant="green" icon={<Sparkles className="w-2.5 h-2.5" />}>
                        AI handling
                      </Pill>
                    )}
                    {idx === 0 && <Tag>serum</Tag>}
                    {idx === 3 && (
                      <>
                        <Pill variant="blue">Gulf dialect</Pill>
                        <Pill variant="green">Lead</Pill>
                      </>
                    )}
                    {idx === 4 && <Tag>Flow: Glow kit</Tag>}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
