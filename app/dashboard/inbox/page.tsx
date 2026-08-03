"use client"

import { useState } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { ConversationList } from "@/components/inbox/ConversationList"
import { ChatWindow } from "@/components/inbox/ChatWindow"
import { Loader2, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

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
            <div className="min-h-[calc(100vh-64px)] bg-[#03010A] flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full p-8 bg-white/[0.02] border border-white/10 rounded-2xl text-center space-y-4">
                    <div className="w-12 h-12 bg-[#ffe14d]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare className="w-6 h-6 text-[#ffe14d]" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Connect Instagram</h2>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                        You need to connect your professional Instagram account to use the inbox.
                    </p>
                    <div className="pt-4">
                        <a href="/api/instagram/auth" className="inline-block px-8 py-3 bg-[#ffe14d] text-black font-semibold rounded-full hover:brightness-95 transition-all w-full">
                            Connect Account
                        </a>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-[calc(100vh-2rem)] rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex relative">
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
        </div>
    )
}
