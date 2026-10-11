"use client"

import { useState } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { ConversationList } from "@/components/inbox/ConversationList"
import { ChatWindow } from "@/components/inbox/ChatWindow"
import { CustomerCopilotRail } from "@/components/inbox/CustomerCopilotRail"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import ConnectPlatformEmptyState from "@/components/dashboard/ConnectPlatformEmptyState"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export default function InboxPage() {
  const { userId, isLoading } = useInstagramSession()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [selectedRecipientName, setSelectedRecipientName] = useState<string | null>(null)
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram")

  const handleSelect = (id: string, name: string, recipientId: string, platform: string) => {
    setSelectedConversationId(id)
    setSelectedRecipientName(name)
    setSelectedRecipientId(recipientId)
    setSelectedPlatform(platform || "instagram")
  }

  const channel = selectedPlatform === "facebook" ? "messenger" : selectedPlatform.toLowerCase()

  // Contact context query for selected contact
  const { data: contactContext, mutate: mutateContact } = useSWR(
    selectedRecipientId
      ? `/api/contacts?externalId=${encodeURIComponent(selectedRecipientId)}&channel=${encodeURIComponent(
          channel
        )}&conversationId=${encodeURIComponent(selectedConversationId || "")}`
      : null,
    fetcher
  )

  const botPaused = Boolean(contactContext?.contact?.bot_paused)

  const handleToggleBot = async () => {
    const contactId = contactContext?.contact?.id
    if (contactId) {
      await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_paused: !botPaused }),
      })
    } else if (selectedRecipientId) {
      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          externalId: selectedRecipientId,
          displayName: selectedRecipientName,
          bot_paused: !botPaused,
        }),
      })
    }
    mutateContact()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-52px)] bg-[var(--bg)]">
        <Loader2 className="w-7 h-7 text-[var(--t3)] animate-spin" />
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="h-[calc(100vh-52px)] bg-[var(--bg)] p-6 flex items-center justify-center">
        <ConnectPlatformEmptyState description="Connect your Instagram, WhatsApp, or Messenger channel to use the unified inbox." />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-52px)] flex bg-[var(--bg)] overflow-hidden w-full relative">
      {/* Column 1: Conversations List (~320px) */}
      <div
        className={cn(
          "w-full md:w-[320px] lg:w-[340px] shrink-0 absolute md:static inset-0 z-20 md:z-auto transition-transform duration-200 md:translate-x-0 h-full",
          selectedConversationId ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        )}
      >
        <ConversationList
          userId={userId}
          selectedId={selectedConversationId}
          onSelect={handleSelect}
        />
      </div>

      {/* Column 2: Chat Window / Thread (flex-1) */}
      <div
        className={cn(
          "flex-1 w-full absolute md:static inset-0 z-30 md:z-auto transition-transform duration-200 md:translate-x-0 h-full flex flex-col",
          selectedConversationId ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        <ChatWindow
          conversationId={selectedConversationId}
          recipientName={selectedRecipientName}
          recipientId={selectedRecipientId || undefined}
          platform={selectedPlatform}
          userId={userId}
          onBack={() => setSelectedConversationId(null)}
          contactContext={contactContext}
          mutateContact={mutateContact}
        />
      </div>

      {/* Column 3: Customer Copilot Rail (~320px, visible on lg screens when conversation is selected) */}
      <div className="hidden lg:flex h-full shrink-0">
        <CustomerCopilotRail
          recipientName={selectedRecipientName}
          recipientId={selectedRecipientId || undefined}
          platform={selectedPlatform}
          contactContext={contactContext}
          botPaused={botPaused}
          onToggleBot={handleToggleBot}
        />
      </div>
    </div>
  )
}
