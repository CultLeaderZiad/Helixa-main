"use client"

import * as React from "react"
import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useRouter, usePathname } from "next/navigation"
import {
  Search,
  LayoutDashboard,
  MessageSquare,
  Zap,
  Sparkles,
  Users,
  Megaphone,
  BarChart3,
  Share2,
  CreditCard,
  Settings,
  Shield,
  Hash,
  ArrowRight,
  Plus,
  FileText,
  BookOpen,
  Bot,
  Keyboard,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CommandItem {
  id: string
  label: string
  /** Secondary text shown in muted below the label */
  description?: string
  /** Icon to display */
  icon: React.ElementType
  /** Where to navigate */
  href?: string
  /** Callback instead of navigation */
  action?: () => void
  /** Visual group for the list */
  group: "navigation" | "actions" | "recent"
  /** AI-related items get gold icon */
  isAi?: boolean
  /** Keyboard shortcut hint */
  shortcut?: string
  /** Search aliases */
  keywords?: string[]
}

/* ------------------------------------------------------------------ */
/*  Static Items                                                       */
/* ------------------------------------------------------------------ */

const NAV_ITEMS: CommandItem[] = [
  {
    id: "nav-overview",
    label: "Overview",
    description: "Dashboard home with KPIs and weekly coach",
    icon: LayoutDashboard,
    href: "/dashboard",
    group: "navigation",
    shortcut: "G O",
    keywords: ["home", "dashboard", "kpi", "stats"],
  },
  {
    id: "nav-inbox",
    label: "Inbox",
    description: "Conversations across all channels",
    icon: MessageSquare,
    href: "/dashboard/inbox",
    group: "navigation",
    shortcut: "G I",
    keywords: ["conversations", "messages", "chat", "dm"],
  },
  {
    id: "nav-automations",
    label: "Automations",
    description: "Rules, triggers and flow previews",
    icon: Zap,
    href: "/dashboard/automations",
    group: "navigation",
    shortcut: "G A",
    keywords: ["rules", "triggers", "workflows"],
  },
  {
    id: "nav-ai-agent",
    label: "AI Agent",
    description: "Agents, knowledge base and model settings",
    icon: Sparkles,
    href: "/dashboard/ai-engine",
    group: "navigation",
    isAi: true,
    shortcut: "G X",
    keywords: ["ai", "knowledge", "model", "llm", "agent"],
  },
  {
    id: "nav-contacts",
    label: "Contacts",
    description: "Lead database and tags",
    icon: Users,
    href: "/dashboard/contacts",
    group: "navigation",
    keywords: ["leads", "customers", "people"],
  },
  {
    id: "nav-broadcasts",
    label: "Broadcasts",
    description: "Scheduled and sent campaigns",
    icon: Megaphone,
    href: "/dashboard/broadcasts",
    group: "navigation",
    keywords: ["campaigns", "bulk", "send"],
  },
  {
    id: "nav-analytics",
    label: "Analytics",
    description: "Performance metrics and funnel data",
    icon: BarChart3,
    href: "/dashboard/analytics",
    group: "navigation",
    keywords: ["metrics", "reports", "funnel", "performance"],
  },
  {
    id: "nav-channels",
    label: "Channels",
    description: "Connect and monitor Instagram, WhatsApp, Messenger, TikTok, Telegram",
    icon: Share2,
    href: "/dashboard/connected-platforms",
    group: "navigation",
    keywords: ["platforms", "instagram", "whatsapp", "messenger", "tiktok", "telegram", "connect"],
  },
  {
    id: "nav-billing",
    label: "Billing",
    description: "Plan, usage meters and payment methods",
    icon: CreditCard,
    href: "/dashboard/billing",
    group: "navigation",
    keywords: ["plan", "payment", "subscription", "vodafone", "paymob"],
  },
  {
    id: "nav-settings",
    label: "Settings",
    description: "Team, white-label, security and API keys",
    icon: Settings,
    href: "/dashboard/settings",
    group: "navigation",
    shortcut: "G S",
    keywords: ["profile", "team", "white-label", "api", "webhooks"],
  },
]

const ACTION_ITEMS: CommandItem[] = [
  {
    id: "action-new-automation",
    label: "New automation",
    description: "Create a new trigger rule",
    icon: Plus,
    href: "/dashboard/automations?new=1",
    group: "actions",
    keywords: ["create", "rule", "trigger"],
  },
  {
    id: "action-new-broadcast",
    label: "New broadcast",
    description: "Send a campaign to contacts",
    icon: Megaphone,
    href: "/dashboard/broadcasts?new=1",
    group: "actions",
    keywords: ["campaign", "send", "bulk"],
  },
  {
    id: "action-add-knowledge",
    label: "Add to knowledge base",
    description: "Upload a document or add a FAQ answer",
    icon: BookOpen,
    href: "/dashboard/ai-engine?tab=knowledge",
    group: "actions",
    isAi: true,
    keywords: ["faq", "document", "upload"],
  },
  {
    id: "action-manage-agents",
    label: "Configure AI agent",
    description: "Change agent persona, model or behaviour",
    icon: Bot,
    href: "/dashboard/ai-engine?tab=agents",
    group: "actions",
    isAi: true,
    keywords: ["persona", "model", "llm"],
  },
  {
    id: "action-connect-channel",
    label: "Connect a channel",
    description: "Add Instagram, WhatsApp or another platform",
    icon: Share2,
    href: "/dashboard/connected-platforms",
    group: "actions",
    keywords: ["platform", "connect", "instagram", "whatsapp"],
  },
  {
    id: "action-invite-member",
    label: "Invite team member",
    description: "Add an agent or admin to this workspace",
    icon: Users,
    href: "/dashboard/settings/team",
    group: "actions",
    keywords: ["team", "invite", "member", "agent"],
  },
  {
    id: "action-updates",
    label: "What's new",
    description: "Latest release notes and product updates",
    icon: FileText,
    href: "/dashboard/updates",
    group: "actions",
    keywords: ["changelog", "release", "update"],
  },
]

const GROUP_LABELS: Record<string, string> = {
  navigation: "Go to",
  actions: "Actions",
  recent: "Recent",
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CommandPalette() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  // All searchable items
  const allItems = useMemo(() => [...NAV_ITEMS, ...ACTION_ITEMS], [])

  // Filter by query
  const filtered = useMemo(() => {
    if (!query.trim()) return allItems
    const q = query.toLowerCase().trim()
    return allItems.filter((item) => {
      if (item.label.toLowerCase().includes(q)) return true
      if (item.description?.toLowerCase().includes(q)) return true
      if (item.keywords?.some((k) => k.includes(q))) return true
      return false
    })
  }, [query, allItems])

  // Group filtered items
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: CommandItem[] }[] = []
    const order = ["navigation", "actions", "recent"]
    for (const key of order) {
      const items = filtered.filter((i) => i.group === key)
      if (items.length > 0) {
        groups.push({ key, label: GROUP_LABELS[key] || key, items })
      }
    }
    return groups
  }, [filtered])

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped])

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= flatItems.length) {
      setSelectedIndex(Math.max(0, flatItems.length - 1))
    }
  }, [flatItems.length, selectedIndex])

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      // Focus input after animation
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Execute item
  const executeItem = useCallback(
    (item: CommandItem) => {
      setOpen(false)
      if (item.action) {
        item.action()
      } else if (item.href) {
        router.push(item.href)
      }
    },
    [router]
  )

  // Keyboard nav inside the palette
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1))
      scrollIntoView(selectedIndex + 1)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
      scrollIntoView(selectedIndex - 1)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = flatItems[selectedIndex]
      if (item) executeItem(item)
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const scrollIntoView = (idx: number) => {
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-cmd-index="${idx}"]`)
      el?.scrollIntoView({ block: "nearest" })
    })
  }

  // Highlight the current page
  const isCurrentPage = (href?: string) => {
    if (!href) return false
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  if (!mounted || !open) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[min(18vh,140px)] px-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[4px] transition-opacity"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        className="relative z-[9999] w-full max-w-[560px] max-h-[min(70vh,520px)] flex flex-col rounded-[12px] bg-[var(--s1)] border border-[var(--line2)] shadow-2xl overflow-hidden outline-none animate-in fade-in-0 zoom-in-[0.98]"
      >
        {/* Search Input Row */}
        <div className="flex items-center gap-2.5 h-[48px] px-4 border-b border-[var(--line)]">
            <Search className="size-4 text-[var(--t3)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search or jump to..."
              className="flex-1 bg-transparent text-[14px] text-[var(--t1)] placeholder:text-[var(--t3)] outline-none h-full"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded-[4px] bg-[var(--s3)] border border-[var(--line2)] text-[var(--t3)]">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 scrollbar-thin scrollbar-thumb-[var(--line2)] scrollbar-track-transparent"
            role="listbox"
          >
            {flatItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[13px] text-[var(--t3)]">
                  No results for &ldquo;{query}&rdquo;
                </p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.key} className="mb-1">
                  {/* Group Label */}
                  <div className="px-4 pt-2 pb-1">
                    <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[var(--t4)]">
                      {group.label}
                    </span>
                  </div>

                  {/* Items */}
                  {group.items.map((item) => {
                    const globalIndex = flatItems.indexOf(item)
                    const isSelected = globalIndex === selectedIndex
                    const isCurrent = isCurrentPage(item.href)
                    const Icon = item.icon

                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-cmd-index={globalIndex}
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-start transition-colors cursor-pointer outline-none",
                          isSelected
                            ? "bg-[var(--s2)]"
                            : "hover:bg-[var(--s2)]/60"
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            item.isAi
                              ? "text-[var(--gold)]"
                              : isCurrent
                              ? "text-[var(--t1)]"
                              : "text-[var(--t3)]"
                          )}
                          strokeWidth={1.8}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-[13px] truncate",
                                isCurrent
                                  ? "text-[var(--t1)] font-semibold"
                                  : "text-[var(--t1)] font-medium"
                              )}
                            >
                              {item.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-mono text-[var(--t4)] shrink-0">
                                current
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-[var(--t3)] truncate mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {item.shortcut && (
                          <div className="hidden sm:flex items-center gap-0.5 shrink-0">
                            {item.shortcut.split(" ").map((k, i) => (
                              <kbd
                                key={i}
                                className="px-1 py-0.5 text-[10px] font-mono rounded-[3px] bg-[var(--s3)] border border-[var(--line2)] text-[var(--t3)] min-w-[18px] text-center"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        )}

                        {isSelected && !item.shortcut && (
                          <ArrowRight className="size-3 text-[var(--t3)] shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer Hints */}
          <div className="h-[34px] px-4 border-t border-[var(--line)] flex items-center justify-between text-[10.5px] text-[var(--t3)] font-mono shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-px rounded-[3px] bg-[var(--s3)] border border-[var(--line2)] text-[9px]">↑</kbd>
                <kbd className="px-1 py-px rounded-[3px] bg-[var(--s3)] border border-[var(--line2)] text-[9px]">↓</kbd>
                <span className="ms-0.5">navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-px rounded-[3px] bg-[var(--s3)] border border-[var(--line2)] text-[9px]">↵</kbd>
                <span className="ms-0.5">select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-px rounded-[3px] bg-[var(--s3)] border border-[var(--line2)] text-[9px]">esc</kbd>
                <span className="ms-0.5">close</span>
              </span>
            </div>
            <span className="text-[var(--t4)]">
              {flatItems.length} {flatItems.length === 1 ? "result" : "results"}
            </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
