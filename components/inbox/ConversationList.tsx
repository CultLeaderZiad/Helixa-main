"use client"

import { useEffect, useState } from "react"
import { Search, Loader2, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types/db"

interface ConversationListProps {
    userId: string
    selectedId: string | null
    onSelect: (id: string, username: string, recipientId: string) => void
}

export function ConversationList({ userId, selectedId, onSelect }: ConversationListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) return

        const fetchConversations = async () => {
            try {
                const res = await fetch(`/api/inbox/conversations?userId=${userId}`)
                const data = await res.json()
                if (Array.isArray(data)) {
                    setConversations(data)
                }
            } catch (error) {
                console.error("Failed to load conversations", error)
            } finally {
                setLoading(false)
            }
        }

        fetchConversations()
    }, [userId])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full border-r border-white/5 bg-[#03010A]/60 backdrop-blur-3xl w-full md:w-[350px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="p-4 border-b border-white/5 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-white tracking-tight">Inbox</h2>
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                        <span className="text-[#ffe14d] text-xs font-bold">+</span>
                    </div>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-[#ffe14d] transition-colors" />
                    <input
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ffe14d]/50 focus:bg-black/60 focus:shadow-[0_0_15px_rgba(255,225,77,0.05)] placeholder:text-neutral-600 transition-all duration-300"
                        placeholder="Search messages..."
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent relative z-10">
                {conversations.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <Search className="w-5 h-5 text-neutral-600" />
                        </div>
                        <p className="text-neutral-500 text-sm font-medium">No conversations yet.</p>
                    </div>
                ) : (
                    conversations.map((conv, index) => {
                        const isSelected = selectedId === conv.id
                        return (
                            <div
                                key={conv.id}
                                onClick={() => onSelect(conv.id, conv.recipient_username, conv.recipient_id.toString())}
                                className={cn(
                                    "p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 group relative overflow-hidden animate-in fade-in slide-in-from-left-4",
                                    isSelected
                                        ? "bg-gradient-to-r from-[#ffe14d]/10 to-transparent border border-[#ffe14d]/20"
                                        : "hover:bg-white/[0.04] border border-transparent hover:border-white/[0.05]"
                                )}
                                style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms`, animationDuration: '500ms' }}
                            >
                                {isSelected && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#ffe14d] rounded-r-full" />
                                )}
                                
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={cn(
                                            "font-bold text-sm truncate transition-colors",
                                            isSelected ? "text-white" : "text-neutral-300 group-hover:text-white"
                                        )}>
                                            {conv.recipient_username}
                                        </span>
                                        <span className={cn(
                                            "text-[10px] whitespace-nowrap font-medium",
                                            isSelected ? "text-[#ffe14d]" : "text-neutral-500"
                                        )}>
                                            {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-xs truncate transition-colors",
                                        isSelected ? "text-neutral-300" : "text-neutral-500 group-hover:text-neutral-400"
                                    )}>
                                        Click to view conversation...
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
