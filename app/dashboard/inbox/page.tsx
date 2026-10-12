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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export default function InboxPage() {
  const { userId, isLoading } = useInstagramSession()
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [selectedRecipientName, setSelectedRecipientName] = useState<string | null>(null)
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram")
  const [isRailOpenMobile, setIsRailOpenMobile] = useState<boolean>(false)

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
      {/* Column 1: Conversations List (300px) */}
      <div
        className={cn(
          "w-full md:w-[300px] shrink-0 absolute md:static inset-0 z-20 md:z-auto transition-transform duration-200 md:translate-x-0 h-full",
          selectedConversationId ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        )}
      >
        <ConversationList
          userId={userId}
          selectedId={selectedConversationId}
          onSelect={handleSelect}
        />
      </div>

      {/* Column 2: Chat Window / Thread (fluid) */}
      <div
        className={cn(
          "flex-1 w-full absolute md:static inset-0 z-30 md:z-auto transition-transform duration-200 md:translate-x-0 h-full flex flex-col min-w-0",
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
          onOpenContextRail={() => setIsRailOpenMobile(true)}
        />
      </div>

      {/* Column 3: Customer Copilot Rail (300px, visible on lg screens) */}
      <div className="hidden lg:flex w-[300px] h-full shrink-0">
        <CustomerCopilotRail
          recipientName={selectedRecipientName}
          recipientId={selectedRecipientId || undefined}
          platform={selectedPlatform}
          contactContext={contactContext}
          botPaused={botPaused}
          onToggleBot={handleToggleBot}
        />
      </div>

      {/* Mobile/Tablet Context Rail Sheet (<1024px) */}
      <Sheet open={isRailOpenMobile} onOpenChange={setIsRailOpenMobile}>
        <SheetContent side="right" className="p-0 w-[300px] sm:w-[320px] bg-[var(--s1)] border-l border-[var(--line)]">
          <SheetHeader className="sr-only">
            <SheetTitle>Conversation Context</SheetTitle>
          </SheetHeader>
          <CustomerCopilotRail
            recipientName={selectedRecipientName}
            recipientId={selectedRecipientId || undefined}
            platform={selectedPlatform}
            contactContext={contactContext}
            botPaused={botPaused}
            onToggleBot={handleToggleBot}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
