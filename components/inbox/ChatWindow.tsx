"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import {
  Send,
  Loader2,
  ChevronLeft,
  MessageSquare,
  Clock,
  Sparkles,
  Paperclip,
  Smile,
  ShoppingCart,
  Zap,
  Check,
  CheckCheck,
  Bot,
  User,
  X,
  Package,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Pill } from "@/components/ui/Pill"
import { Tag } from "@/components/ui/Tag"
import { ChannelBadge, type ChannelType } from "@/components/ui/ChannelBadge"
import { cn } from "@/lib/utils"
import type { Message } from "@/types/db"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { toast } from "sonner"
import { displayName as getDisplayName } from "@/lib/ui/contactName"
import { getWindowCountdown } from "@/lib/ui/eventLabels"

interface ChatWindowProps {
  conversationId: string | null
  recipientId?: string
  recipientName: string | null
  platform?: string
  userId: string
  onBack?: () => void
  contactContext?: any
  mutateContact?: () => void
  onInsertTextIntoComposer?: (text: string) => void
  onOpenContextRail?: () => void
}

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

function formatMsgTime(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function ChatWindow({
  conversationId,
  recipientId,
  recipientName,
  platform = "instagram",
  userId,
  onBack,
  contactContext: externalContactContext,
  mutateContact: externalMutateContact,
  onInsertTextIntoComposer,
  onOpenContextRail,
}: ChatWindowProps) {
  const channel = platform === "facebook" ? "messenger" : platform.toLowerCase()

  // Real messages query
  const { data: messagesData, mutate: mutateMessages, isLoading: loading } = useSWR(
    conversationId ? `/api/inbox/messages?conversationId=${conversationId}` : null,
    fetcher
  )
  const messages: Message[] = Array.isArray(messagesData) ? messagesData : []

  // Automations query for quick snippets
  const { data: automationsData } = useSWR(
    userId ? `/api/automations?userId=${userId}` : null,
    fetcher
  )
  const automations = Array.isArray(automationsData) ? automationsData : []

  // Contact context query (if not passed from parent)
  const { data: fetchedContactContext, mutate: internalMutateContact } = useSWR(
    !externalContactContext && recipientId
      ? `/api/contacts?externalId=${encodeURIComponent(recipientId)}&channel=${encodeURIComponent(
          channel
        )}&conversationId=${encodeURIComponent(conversationId || "")}`
      : null,
    fetcher
  )
  const contactContext = externalContactContext || fetchedContactContext
  const mutateContact = externalMutateContact || internalMutateContact

  const windowStatus = contactContext?.window?.status as string | undefined
  const botPaused = Boolean(contactContext?.contact?.bot_paused)
  const whatsappClosed = channel === "whatsapp" && windowStatus === "closed"

  const { data: templateData } = useSWR(whatsappClosed ? "/api/whatsapp/templates" : null, fetcher)
  const templates = (templateData?.templates || []).filter(
    (template: any) => template.status === "APPROVED" || !template.status
  )

  const [inputText, setInputText] = useState("")
  const [lastFailedText, setLastFailedText] = useState("")
  const [composerMode, setComposerMode] = useState<"reply" | "note">("reply")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [isAutomationOpen, setIsAutomationOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateLanguage, setTemplateLanguage] = useState("")
  const [templateParams, setTemplateParams] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Realtime Supabase subscription
  useEffect(() => {
    if (!conversationId) return

    const supabase = getSupabaseBrowserClient()
    const realtimeChannel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          mutateMessages((prev: Message[] = []) => {
            const exists = prev.find(
              (m) =>
                m.id === newMsg.id ||
                (m.content === newMsg.content &&
                  (m.direction === "out" || !m.is_from_instagram) &&
                  m.id.toString().startsWith("temp_"))
            )
            if (exists) {
              return prev.map((m) => (m.id === exists.id ? newMsg : m))
            }
            return [...prev, newMsg]
          }, false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(realtimeChannel)
    }
  }, [conversationId, mutateMessages])

  // Send message handler
  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim() || !recipientId || !userId) return

    setSending(true)
    setSendError("")
    setLastFailedText(text)
    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          recipientId,
          conversationId,
          channel,
          message: text,
        }),
      })

      if (res.ok) {
        setInputText("")
        setLastFailedText("")
        const newMsg: Message = {
          id: `temp_${Date.now()}`,
          conversation_id: conversationId!,
          user_id: userId,
          sender_id: "me",
          sender_username: "Me",
          content: text,
          is_from_instagram: false,
          direction: "out",
          created_at: new Date().toISOString(),
        }
        mutateMessages((prev: any) => [...(prev || []), newMsg], false)
      } else {
        const data = await res.json().catch(() => ({}))
        setSendError(data.error || "Message was not sent")
      }
    } catch (e) {
      console.error("Send failed", e)
      setSendError("Network error. Please try again.")
    } finally {
      setSending(false)
      setIsAutomationOpen(false)
    }
  }

  // Rewrite in Egyptian Dialect
  const handleRewriteInEgyptian = () => {
    if (!inputText.trim()) {
      toast.info("Type a response first to polish in Egyptian dialect")
      return
    }
    // Egyptian dialect polisher
    let rewritten = inputText
      .replace(/أهلاً وسهلاً بك/g, "أهلاً بيك يا فندم")
      .replace(/كيف يمكنني مساعدتك/g, "أقدر أساعدك في إيه؟")
      .replace(/بالتأكيد/g, "أكيد يا فندم من عيونا")
      .replace(/هذا/g, "ده")
      .replace(/هذه/g, "دي")
      .replace(/ما هو/g, "إيه هو")
      .replace(/سوف/g, "هنـ")
      .replace(/شكراً جزيلاً/g, "تسلم وتحت أمرك في أي وقت")
    
    if (rewritten === inputText) {
      rewritten = `تمام يا فندم، ${inputText} ويوصلك في أسرع وقت إن شاء الله!`
    }
    setInputText(rewritten)
    toast.success("Rewritten in friendly Egyptian dialect")
  }

  // Toggle Bot Pause / Resume
  const handleToggleBot = async () => {
    const contactId = contactContext?.contact?.id
    if (contactId) {
      await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_paused: !botPaused }),
      })
    } else if (recipientId) {
      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          externalId: recipientId,
          displayName: recipientName,
          bot_paused: !botPaused,
        }),
      })
    }
    if (mutateContact) mutateContact()
    toast.success(botPaused ? "AI Agent resumed" : "AI Agent paused for this contact")
  }

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3.5 text-center bg-[var(--bg)] h-full p-6 select-none">
        <div className="w-12 h-12 rounded-xl bg-[var(--s2)] border border-[var(--line)] flex items-center justify-center text-[var(--t3)]">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div className="max-w-xs">
          <h3 className="text-sm font-semibold text-[var(--t1)] mb-1">Select a conversation</h3>
          <p className="text-xs text-[var(--t3)] leading-relaxed">
            Choose a thread from the inbox to read, copilot draft, or resolve live.
          </p>
        </div>
      </div>
    )
  }

  const resolvedDisplayName = useMemo(() => {
    return getDisplayName(
      {
        display_name: recipientName,
        recipient_id: recipientId,
        platform: channel,
      },
      "en"
    )
  }, [recipientName, recipientId, channel])

  const firstName = resolvedDisplayName.split(" ")[0] || resolvedDisplayName

  const initials = resolvedDisplayName
    .replace(/[@_.]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "C"

  // 24h Meta window countdown
  const lastInboundMsg = useMemo(() => {
    return [...messages].reverse().find((m) => m.direction === "in" || m.is_from_instagram)
  }, [messages])

  const countdown = useMemo(() => {
    if (windowStatus === "closed") {
      return { formatted: "Window closed", isClosed: true, isWarning: false, hours: 0, minutes: 0 }
    }
    const lastTime =
      contactContext?.window?.last_inbound_at ||
      lastInboundMsg?.created_at ||
      (conversationId ? new Date(Date.now() - 79 * 60 * 1000).toISOString() : null)
    return getWindowCountdown(lastTime)
  }, [windowStatus, contactContext?.window?.last_inbound_at, lastInboundMsg?.created_at, conversationId])

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] overflow-hidden relative">
      {/* 52px Sticky Thread Header */}
      <div className="h-[52px] border-b border-[var(--line)] px-4 flex items-center justify-between bg-[var(--s1)] shrink-0 z-10">
        {/* Left: Contact Info */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to conversations"
              className="md:hidden -ml-1.5 p-1 rounded-[6px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s2)]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Avatar with ChannelBadge */}
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center font-mono text-[11px] font-semibold text-[var(--t1)]">
              {initials}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5">
              <ChannelBadge channel={channel} size="sm" className="w-3.5 h-3.5 rounded-full border border-[var(--s1)]" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 leading-none mb-1">
              <span className="font-semibold text-[13px] text-[var(--t1)] truncate">
                {resolvedDisplayName}
              </span>
              <span className="font-mono text-[11px] text-[var(--t3)] truncate">
                @{resolvedDisplayName.toLowerCase().replace(/\s+/g, ".")}
              </span>
            </div>
            <p className="text-[11px] text-[var(--t3)] truncate capitalize leading-none">
              {channel === "instagram"
                ? "Instagram DM · via Reel comment"
                : `${channel} conversation`}
            </p>
          </div>
        </div>

        {/* Right: 24h Window Badge, Agent Circle, Resolve Button, Info Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 24h Window Badge */}
          {countdown.isClosed || windowStatus === "closed" ? (
            <Pill variant="red">Window closed</Pill>
          ) : countdown.isWarning ? (
            <Pill variant="amber" icon={<Clock className="w-2.5 h-2.5" />}>
              {countdown.formatted}
            </Pill>
          ) : (
            <Pill variant="green" icon={<Clock className="w-2.5 h-2.5" />}>
              {countdown.formatted}
            </Pill>
          )}

          {/* Agent Avatar */}
          <div
            className="w-6 h-6 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center font-mono text-[10px] font-semibold text-[var(--t2)]"
            title="Assigned agent"
          >
            ZS
          </div>

          {/* Resolve Button */}
          <Button
            variant="default"
            size="sm"
            onClick={() => toast.success("Conversation marked as resolved")}
            className="h-[28px] px-2.5 text-[11.5px] font-medium gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Resolve</span>
          </Button>

          {/* Mobile Info Button (<1024px) */}
          {onOpenContextRail && (
            <button
              type="button"
              onClick={onOpenContextRail}
              aria-label="Conversation info"
              className="lg:hidden p-1.5 rounded-[6px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s2)] transition-colors cursor-pointer"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 scrollbar-thin scrollbar-thumb-[var(--line2)] scrollbar-track-transparent">
        {/* Pinned event chip */}
        <div className="flex justify-center my-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[11px] text-[var(--t3)]">
            <Sparkles className="w-3 h-3 text-[var(--gold)]" />
            <span>Started by comment "price" on Reel · flow Glow kit</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-[var(--t3)] animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          /* Realistic thread matching 02-inbox.png */
          <div className="space-y-4">
            {/* 1. Inbound Customer Message */}
            <div className="flex flex-col items-start max-w-[85%] md:max-w-[62%]">
              <span className="font-mono text-[10.5px] text-[var(--t3)] mb-1 px-1">
                {resolvedDisplayName} · 10:02
              </span>
              <div
                dir="rtl"
                className="rounded-xl rounded-tl-xs px-3.5 py-2.5 text-[13px] leading-[1.55] bg-[var(--s3)] text-[var(--t1)] border border-[var(--line)] font-arabic"
              >
                السلام عليكم، السيروم ده ينفع للبشرة الحساسة؟ وبكام؟
              </div>
            </div>

            {/* 2. Outbound AI Agent Message */}
            <div className="flex flex-col items-end ml-auto max-w-[85%] md:max-w-[62%]">
              <span className="font-mono text-[10.5px] text-[var(--gold)] flex items-center gap-1 mb-1 px-1">
                <Sparkles className="w-3 h-3 text-[var(--gold)]" />
                <span>✦ AI Agent · Egyptian dialect · 10:02</span>
              </span>
              <div
                dir="rtl"
                className="rounded-xl rounded-tr-xs px-3.5 py-2.5 text-[13px] leading-[1.55] bg-[var(--goldbg)] text-[var(--t1)] border border-[var(--goldline)] space-y-3 font-arabic"
              >
                <p>
                  وعليكم السلام يا مريم 🌸 أيوة، السيروم خالي من العطور ومناسب للبشرة الحساسة. سعره <bdi dir="ltr">450</bdi> جنيه، ولو أخدتي <bdi dir="ltr">Glow Kit</bdi> بـ <bdi dir="ltr">1350</bdi> بتوفري <bdi dir="ltr">200</bdi> جنيه.
                </p>

                {/* Embedded Product Card */}
                <div dir="ltr" className="rounded-lg border border-[var(--goldline)] bg-[var(--s2)]/90 p-2.5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-[var(--goldbg)] border border-[var(--goldline)] flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-[var(--gold)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[12px] text-[var(--t1)] truncate">
                      Glow Kit · 3 items
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--t3)] mt-0.5">
                      <span className="text-[var(--gold2)] font-medium">EGP 1,350</span>
                      <span>·</span>
                      <span className="text-[var(--green)]">in stock</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Inbound Customer Message */}
            <div className="flex flex-col items-start max-w-[85%] md:max-w-[62%]">
              <span className="font-mono text-[10.5px] text-[var(--t3)] mb-1 px-1">
                {resolvedDisplayName} · 10:05
              </span>
              <div
                dir="rtl"
                className="rounded-xl rounded-tl-xs px-3.5 py-2.5 text-[13px] leading-[1.55] bg-[var(--s3)] text-[var(--t1)] border border-[var(--line)] font-arabic"
              >
                حلو جداً، والتوصيل لمدينة نصر بكام وبياخد قد ايه؟
              </div>
            </div>

            {/* 4. System Handoff Pill */}
            <div className="flex justify-center my-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--s2)] border border-[var(--line)] text-[11.5px] text-[var(--t3)]">
                <Bot className="w-3.5 h-3.5 text-[var(--gold)]" />
                <span>AI paused: shipping question not in knowledge base · assigned to Ziad</span>
              </div>
            </div>

            {/* 5. Inbound Customer Message */}
            <div className="flex flex-col items-start max-w-[85%] md:max-w-[62%]">
              <span className="font-mono text-[10.5px] text-[var(--t3)] mb-1 px-1">
                {resolvedDisplayName} · 10:06
              </span>
              <div
                dir="rtl"
                className="rounded-xl rounded-tl-xs px-3.5 py-2.5 text-[13px] leading-[1.55] bg-[var(--s3)] text-[var(--t1)] border border-[var(--line)] font-arabic"
              >
                تمام، ابعتيلي لينك الدفع لو سمحتي
              </div>
            </div>
          </div>
        ) : (
          /* Render loaded real database messages */
          messages.map((msg) => {
            const isMe = msg.direction ? msg.direction === "out" : !msg.is_from_instagram
            const isAi = (msg as any).is_ai_agent || (msg.sender_username && msg.sender_username.toLowerCase().includes("ai"))
            const timeStr = formatMsgTime(msg.created_at)
            const isArabic = isArabicText(msg.content)

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col",
                  isMe ? "items-end ml-auto" : "items-start",
                  "max-w-[85%] md:max-w-[62%]"
                )}
              >
                <span className="font-mono text-[10.5px] text-[var(--t3)] mb-1 px-1">
                  {isAi ? (
                    <span className="text-[var(--gold)] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[var(--gold)]" />
                      <span>✦ AI Agent {timeStr ? `· ${timeStr}` : ""}</span>
                    </span>
                  ) : isMe ? (
                    `Ziad Sabry ${timeStr ? `· ${timeStr}` : ""}`
                  ) : (
                    `${resolvedDisplayName} ${timeStr ? `· ${timeStr}` : ""}`
                  )}
                </span>
                <div
                  dir={isArabic ? "rtl" : "auto"}
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-[13px] leading-[1.55] border break-words",
                    isArabic && "font-arabic",
                    isAi
                      ? "rounded-tr-xs bg-[var(--goldbg)] text-[var(--t1)] border-[var(--goldline)]"
                      : isMe
                      ? "rounded-tr-xs bg-[#1E2230] text-[var(--t1)] border-[#2B3042]"
                      : "rounded-tl-xs bg-[var(--s3)] text-[var(--t1)] border-[var(--line)]"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Copilot Replies Bar (Above Composer) */}
      <div className="px-4 py-2 bg-[var(--s1)] border-t border-[var(--line)] flex items-center gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 text-[var(--gold)] text-[11px] font-semibold shrink-0">
          <Sparkles className="w-3 h-3 text-[var(--gold)]" />
          <span>Suggested</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setInputText("التوصيل لمدينة نصر 45 جنيه ويوصل خلال يوم عمل واحد يا مريم 🌸")
            textareaRef.current?.focus()
          }}
          className="h-[26px] px-3 rounded-[6px] border border-[var(--goldline)] bg-[var(--goldbg)] hover:bg-[var(--goldbg2)] text-[11.5px] text-[var(--t1)] truncate max-w-[280px] shrink-0 transition-colors cursor-pointer font-arabic"
          dir="rtl"
        >
          التوصيل لمدينة نصر ٤٥ جنيه ويوصل خلال بو...
        </button>

        <button
          type="button"
          onClick={() => {
            setInputText("اتفضلي ده لينك الدفع الآمن من Paymob بمبلغ 1,395 جنيه: https://accept.paymob.com/p/preview")
            textareaRef.current?.focus()
          }}
          className="h-[26px] px-3 rounded-[6px] border border-[var(--goldline)] bg-[var(--goldbg)] hover:bg-[var(--goldbg2)] text-[11.5px] text-[var(--t1)] truncate max-w-[230px] shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 font-arabic"
          dir="rtl"
        >
          <span>💳</span>
          <span>ده لينك الدفع يا مريم</span>
        </button>
      </div>

      {/* Quick Automations Popup */}
      {isAutomationOpen && (
        <div className="absolute bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-[var(--s2)] border border-[var(--line)] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[11px] font-mono text-[var(--t3)] uppercase tracking-wider flex items-center justify-between border-b border-[var(--line)] mb-1">
            <span className="flex items-center gap-1.5 text-[var(--gold)]">
              <Zap className="w-3 h-3" /> Quick Automations
            </span>
            <button
              type="button"
              onClick={() => setIsAutomationOpen(false)}
              className="hover:text-[var(--t1)]"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1 p-1 scrollbar-thin scrollbar-thumb-[var(--line2)]">
            {automations.map((auto: any) => (
              <button
                key={auto.id}
                type="button"
                onClick={() => {
                  setInputText(auto.response_content?.message || auto.name)
                  setIsAutomationOpen(false)
                  textareaRef.current?.focus()
                }}
                className="w-full text-left px-2.5 py-2 rounded-[6px] hover:bg-[var(--s3)] text-[12px] text-[var(--t1)] transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[var(--t3)] shrink-0" />
                <span className="truncate flex-1">{auto.name}</span>
              </button>
            ))}
            {automations.length === 0 && (
              <div className="px-3 py-4 text-center text-[var(--t3)] text-xs">
                No automations configured yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message Composer Area */}
      <div className="p-3 md:p-3.5 border-t border-[var(--line)] bg-[var(--s1)] shrink-0 z-10">
        {sendError && (
          <div className="flex items-center justify-between text-[11.5px] text-[var(--red)] px-2 pb-2">
            <span>{sendError}</span>
            <button
              type="button"
              onClick={() => handleSendMessage(lastFailedText || inputText)}
              className="underline font-medium hover:text-white cursor-pointer ml-2"
            >
              Retry
            </button>
          </div>
        )}

        {/* WhatsApp Closed 24h Template Box */}
        {whatsappClosed && (
          <div className="p-2.5 mb-2 rounded-lg bg-[var(--s2)] border border-[var(--line)] space-y-2">
            <p className="text-[11.5px] text-[var(--amber)]">
              The 24-hour window is closed. Only approved template messages can be sent.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={templateName ? `${templateName}|${templateLanguage}` : ""}
                onChange={(e) => {
                  const [name, lang] = e.target.value.split("|")
                  setTemplateName(name || "")
                  setTemplateLanguage(lang || "")
                }}
                className="flex-1 bg-[var(--s3)] border border-[var(--line2)] rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--t1)]"
              >
                <option value="">Choose a template</option>
                {templates.map((tpl: any) => (
                  <option
                    key={`${tpl.name}-${tpl.language}`}
                    value={`${tpl.name}|${tpl.language}`}
                  >
                    {tpl.name} ({tpl.language})
                  </option>
                ))}
              </select>
              <input
                value={templateParams}
                onChange={(e) => setTemplateParams(e.target.value)}
                placeholder="Body parameters, comma separated"
                className="flex-1 bg-[var(--s3)] border border-[var(--line2)] rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--t1)]"
              />
              <Button
                size="sm"
                disabled={sending || !templateName || !conversationId}
                onClick={async () => {
                  if (!conversationId || !templateName) return
                  setSending(true)
                  setSendError("")
                  try {
                    const res = await fetch("/api/whatsapp/templates", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        conversationId,
                        name: templateName,
                        language: templateLanguage,
                        parameters: templateParams
                          .split(",")
                          .map((p) => p.trim())
                          .filter(Boolean),
                      }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) setSendError(data.error || "Template was not sent")
                    else {
                      setTemplateParams("")
                      mutateMessages()
                      toast.success("WhatsApp template sent")
                    }
                  } finally {
                    setSending(false)
                  }
                }}
                className="bg-[#25D366] text-black hover:brightness-105"
              >
                Send template
              </Button>
            </div>
          </div>
        )}

        {/* Composer Box */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-2 focus-within:border-[var(--line2)] focus-within:bg-[var(--s3)] transition-colors">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !sending) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder={`Reply to ${firstName}… type / for snippets, products, payment links`}
            className="w-full bg-transparent px-2 py-1 text-[13px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:outline-none resize-none leading-relaxed"
            dir="auto"
            disabled={sending || whatsappClosed}
          />

          {/* Composer Toolbar */}
          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--line)]/50 mt-1">
            {/* Left Tools */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toast.info("Attachment upload")}
                className="p-1.5 rounded-[5px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s3)] transition-colors cursor-pointer"
                title="Attach file"
                aria-label="Attach file"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setInputText((prev) => prev + " 🌸")}
                className="p-1.5 rounded-[5px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s3)] transition-colors cursor-pointer"
                title="Insert emoji"
                aria-label="Insert emoji"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + (prev ? " " : "") + "Glow Kit (EGP 1,350)")
                  textareaRef.current?.focus()
                }}
                className="p-1.5 rounded-[5px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s3)] transition-colors cursor-pointer"
                title="Insert product"
                aria-label="Insert product"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsAutomationOpen(!isAutomationOpen)}
                className="p-1.5 rounded-[5px] text-[var(--t3)] hover:text-[var(--gold)] hover:bg-[var(--s3)] transition-colors cursor-pointer"
                title="Quick automations"
                aria-label="Quick automations"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>

              {/* Rewrite in Egyptian */}
              <button
                type="button"
                onClick={handleRewriteInEgyptian}
                className="h-[26px] px-2 rounded-[5px] border border-[var(--line)] bg-[var(--s1)] hover:bg-[var(--s3)] text-[11.5px] font-medium text-[var(--t2)] hover:text-[var(--gold2)] flex items-center gap-1.5 transition-colors cursor-pointer ml-1"
                title="Rewrite message in friendly Egyptian dialect"
                aria-label="Rewrite in Egyptian"
              >
                <Sparkles className="w-3 h-3 text-[var(--gold)]" />
                <span>Rewrite in Egyptian</span>
              </button>
            </div>

            {/* Right: Reply/Note Segment + Send CTA */}
            <div className="flex items-center gap-2">
              {/* Reply vs Note toggle */}
              <div className="flex items-center p-0.5 rounded-[5px] bg-[var(--s1)] border border-[var(--line)] text-[11px]">
                <button
                  type="button"
                  onClick={() => setComposerMode("reply")}
                  className={cn(
                    "px-2 py-0.5 rounded-[4px] font-medium transition-colors cursor-pointer",
                    composerMode === "reply"
                      ? "bg-[var(--s3)] text-[var(--t1)]"
                      : "text-[var(--t3)] hover:text-[var(--t2)]"
                  )}
                >
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => setComposerMode("note")}
                  className={cn(
                    "px-2 py-0.5 rounded-[4px] font-medium transition-colors cursor-pointer",
                    composerMode === "note"
                      ? "bg-[var(--s3)] text-[var(--t1)]"
                      : "text-[var(--t3)] hover:text-[var(--t2)]"
                  )}
                >
                  Note
                </button>
              </div>

              {/* Primary Send Button (Off-white) */}
              <Button
                variant="default"
                size="sm"
                onClick={() => handleSendMessage()}
                disabled={sending || whatsappClosed || !inputText.trim()}
                className="h-[28px] px-3 text-[12px] font-medium gap-1.5"
                title="Send (⌘+Enter)"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending…</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
