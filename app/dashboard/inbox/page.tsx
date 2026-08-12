"use client"

import { useState } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { ConversationList } from "@/components/inbox/ConversationList"
import { ChatWindow } from "@/components/inbox/ChatWindow"
import { FaqSuggestionsPanel } from "@/components/inbox/FaqSuggestionsPanel"
import { Loader2, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import ConnectPlatformEmptyState from "@/components/dashboard/ConnectPlatformEmptyState"
export default function InboxPage() {
    const { userId, isLoading } = useInstagramSession()
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
    const [selectedRecipientName, setSelectedRecipientName] = useState<string | null>(null)
    const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null)

    const handleSelect = (id: string, name: string, recipientId: string) => {
        setSelectedConversationId(id)
        setSelectedRecipientName(name)
        setSelectedRecipientId(recipientId)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
            </div>
        )
    }

    if (!userId) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-transparent p-4 flex items-center justify-center">
                <ConnectPlatformEmptyState description="You need to connect your professional Instagram account to use the inbox." />
            </div>
        )
    }

    return (
        <div className="absolute inset-4 rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex">
            {/* Left Sidebar: Conversation List */}
            <div className={cn(
                "w-full md:w-[350px] flex-shrink-0 border-r border-white/5 bg-black/20 absolute md:static inset-0 z-10 transition-transform duration-300 md:translate-x-0 h-full",
                selectedConversationId ? "-translate-x-full md:translate-x-0" : "translate-x-0"
            )}>
                <ConversationList
                    userId={userId}
                    selectedId={selectedConversationId}
                    onSelect={handleSelect}
                />
            </div>

            {/* Right Main: Chat Window */}
            <div className={cn(
                "flex-1 w-full absolute md:static inset-0 z-20 bg-black md:bg-transparent transition-transform duration-300 md:translate-x-0 h-full",
                selectedConversationId ? "translate-x-0" : "translate-x-full md:translate-x-0"
            )}>
                <ChatWindow
                    conversationId={selectedConversationId}
                    recipientName={selectedRecipientName}
                    recipientId={selectedRecipientId || undefined}
                    userId={userId}
                    onBack={() => setSelectedConversationId(null)}
                />
            </div>
            
            {/* Right Sidebar: FAQ Suggestions (hidden on small screens) */}
            <div className="hidden lg:block h-full">
                <FaqSuggestionsPanel userId={userId} />
            </div>
        </div>
    )
}
