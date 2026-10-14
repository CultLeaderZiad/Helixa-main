"use client"

import React, { useState, useMemo } from "react"
import { Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChannelBadge, type ChannelType } from "@/components/ui/ChannelBadge"
import { displayName as getDisplayName } from "@/lib/ui/contactName"
import { ConversationContextMenu } from "@/components/nav"

export interface ConversationSummary {
  id: string
  recipient_name?: string
  recipient_username?: string
  recipient_id?: string
  platform?: string
  last_message_at?: string | null
  last_message_text?: string | null
  last_message_preview?: string | null
  unread_count?: number
  ai_handled?: boolean
  bot_paused?: boolean
  contact?: {
    display_name?: string
    channel?: string
  }
}

type FilterChip = "all" | "unread" | "mine" | "ai"

export interface MobileInboxViewProps {
  conversations: ConversationSummary[]
  activeConversationId?: string | null
  onSelectConversation: (id: string, name?: string, recipientId?: string, platform?: string) => void
  onNewConversation?: () => void
  loading?: boolean
  className?: string
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  const now = Date.now()
  const diffSec = Math.floor((now - d.getTime()) / 1000)

  if (diffSec < 60) return "now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

export function MobileInboxView({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  loading = false,
  className,
}: MobileInboxViewProps) {
  const [activeChip, setActiveChip] = useState<FilterChip>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)

  // Filter conversations
  const filteredList = useMemo(() => {
    let list = conversations

    if (activeChip === "unread") {
      list = list.filter((c) => (c.unread_count ?? 0) > 0)
    } else if (activeChip === "ai") {
      list = list.filter((c) => c.ai_handled && !c.bot_paused)
    } else if (activeChip === "mine") {
      list = list.filter((c) => c.bot_paused)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((c) => {
        const name = (c.recipient_name || c.contact?.display_name || "").toLowerCase()
        const text = (c.last_message_text || "").toLowerCase()
        return name.includes(q) || text.includes(q)
      })
    }

    return list
  }, [conversations, activeChip, searchQuery])

  const totalCount = conversations.length

  const CHIPS: { id: FilterChip; label: string }[] = [
    { id: "all", label: `All ${totalCount}` },
    { id: "unread", label: "Unread" },
    { id: "mine", label: "Mine" },
    { id: "ai", label: "AI handled" },
  ]

  return (
    <div className={cn("w-full h-full flex flex-col bg-[var(--bg)] select-none", className)}>
      {/* Top Header */}
      <div className="px-4 pt-4 pb-2.5 flex items-center justify-between border-b border-[var(--line)]/50 shrink-0">
        <h1 className="text-[24px] font-bold text-[var(--t1)] tracking-tight leading-none">
          Inbox
        </h1>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search conversations"
            className="w-9 h-9 rounded-[8px] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--s2)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>
          {onNewConversation && (
            <button
              type="button"
              onClick={onNewConversation}
              aria-label="New conversation"
              className="w-9 h-9 rounded-[8px] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--s2)] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Search Input */}
      {searchOpen && (
        <div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--s1)] animate-in fade-in duration-150 shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            autoFocus
            className="w-full h-8 px-3 rounded-[6px] bg-[var(--s2)] border border-[var(--line)] text-[12.5px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none focus:border-[var(--line2)]"
          />
        </div>
      )}

      {/* 32px Filter Chips Row */}
      <div className="px-4 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-[var(--line)] shrink-0">
        {CHIPS.map((chip) => {
          const isActive = activeChip === chip.id
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveChip(chip.id)}
              className={cn(
                "h-8 px-3 rounded-[8px] text-[12px] font-medium transition-colors shrink-0 flex items-center justify-center cursor-pointer",
                isActive
                  ? "bg-[var(--s3)] text-[var(--t1)] font-semibold border border-[var(--line2)] shadow-xs"
                  : "bg-[var(--s1)] text-[var(--t3)] hover:text-[var(--t2)] hover:bg-[var(--s2)] border border-[var(--line)]"
              )}
            >
              <span>{chip.label}</span>
            </button>
          )
        })}
      </div>

      {/* 72px Conversation Rows List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--line2)] scrollbar-track-transparent divide-y divide-[var(--line)]/50 pb-16">
        {loading ? (
          /* Loading skeletons */
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[72px] px-4 flex items-center gap-3 animate-pulse">
              <div className="size-10 rounded-full bg-[var(--s3)] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-28 bg-[var(--s3)] rounded" />
                <div className="h-3 w-44 bg-[var(--s3)] rounded" />
              </div>
            </div>
          ))
        ) : filteredList.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-[14px] font-medium text-[var(--t2)]">No conversations</p>
            <p className="text-[12px] text-[var(--t3)] mt-1">
              {activeChip === "unread"
                ? "You're all caught up on unread messages."
                : "Inbound DMs from your connected channels will appear here."}
            </p>
          </div>
        ) : (
          filteredList.map((conv) => {
            const rawName = conv.recipient_name || conv.recipient_username || conv.contact?.display_name || "Customer"
            const name = getDisplayName(
              {
                display_name: rawName,
                recipient_id: conv.recipient_id || conv.recipient_username,
                platform: conv.platform,
              },
              "en"
            )

            const initials =
              name
                .replace(/[@_.]+/g, " ")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase() || "")
                .join("") || "CU"

            const isUnread = (conv.unread_count ?? 0) > 0
            const isSelected = activeConversationId === conv.id
            const timeAgo = formatRelativeTime(conv.last_message_at)
            const channel = (conv.platform || conv.contact?.channel || "instagram") as ChannelType

            return (
              <ConversationContextMenu
                key={conv.id}
                conversationId={conv.id}
                contactName={name}
                onReply={() =>
                  onSelectConversation(
                    conv.id,
                    name,
                    conv.recipient_id || conv.recipient_username || "",
                    conv.platform || "instagram"
                  )
                }
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectConversation(conv.id, name, conv.recipient_id || conv.recipient_username || "", conv.platform || "instagram")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      onSelectConversation(conv.id, name, conv.recipient_id || conv.recipient_username || "", conv.platform || "instagram")
                    }
                  }}
                  className={cn(
                    "min-h-[72px] h-[72px] px-4 flex items-center justify-between gap-3 transition-colors cursor-pointer",
                    isSelected
                      ? "bg-[var(--s2)]"
                      : "hover:bg-[var(--s1)] active:bg-[var(--s2)]"
                  )}
                >
                  {/* Avatar + Channel Badge + Names */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div className="size-10 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center font-mono text-[12px] font-semibold text-[var(--t1)]">
                        {initials}
                      </div>
                      {/* 18px Channel Badge */}
                      <div className="absolute -bottom-0.5 -end-0.5">
                        <ChannelBadge channel={channel} size="sm" className="w-[18px] h-[18px] border border-[var(--bg)]" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-[14px] font-semibold text-[var(--t1)] truncate leading-tight">
                          {name}
                        </h3>
                      </div>
                      <p className="text-[12.5px] text-[var(--t3)] truncate leading-normal mt-0.5" dir="auto">
                        {conv.last_message_text || conv.last_message_preview || "No message yet"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Timestamp + Unread Blue Dot */}
                  <div className="flex flex-col items-end justify-center gap-1.5 shrink-0 ps-2">
                    <span className="font-mono text-[11px] text-[var(--t3)] tabular-nums leading-none">
                      {timeAgo}
                    </span>
                    {isUnread ? (
                      <span
                        className="size-2 rounded-full bg-[var(--blue)] shadow-xs"
                        aria-label="Unread message"
                      />
                    ) : (
                      <span className="size-2 opacity-0" aria-hidden="true" />
                    )}
                  </div>
                </div>
              </ConversationContextMenu>
            )
          })
        )}
      </div>
    </div>
  )
}
