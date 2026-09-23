"use client"

import { useEffect, useState, useRef } from "react"
import { Search, UserCircle, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/types/db"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { ConversationListSkeleton } from "@/components/ui/DashboardSkeleton"
import { EmptyState } from "@/components/ui/EmptyState"

interface ConversationListProps {
    userId: string
    selectedId: string | null
    onSelect: (id: string, username: string, recipientId: string) => void
}

export function ConversationList({ userId, selectedId, onSelect }: ConversationListProps) {
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const { data, error, isLoading: loading } = useSWR(
        userId ? `/api/inbox/conversations?userId=${userId}` : null,
        fetcher
    )
    const rawConversations: Conversation[] = Array.isArray(data) ? data : []
    const conversations = rawConversations.filter(c => 
        !searchQuery || c.recipient_username.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex flex-col h-full border-r border-white/5 bg-[#03010A]/60 backdrop-blur-3xl w-full md:w-[350px]">
                <div className="p-4 border-b border-white/5">
                    <div className="h-6 w-20 rounded bg-white/[0.06] animate-pulse mb-4" />
                    <div className="h-10 w-full rounded-xl bg-white/[0.04] animate-pulse" />
                </div>
                <ConversationListSkeleton />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full border-r border-white/5 bg-[#03010A]/60 backdrop-blur-3xl w-full md:w-[350px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            
            <div className="p-4 border-b border-white/5 relative z-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white tracking-tight font-serif-display">Inbox</h2>
                    <button
                        type="button"
                        onClick={() => searchInputRef.current?.focus()}
                        title="Search conversations"
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                    >
                        <Search className="w-3.5 h-3.5 text-[#e5a93c]" />
                    </button>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-[#e5a93c] transition-colors" />
                    <input
                        ref={searchInputRef}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#e5a93c]/50 focus:bg-black/60 focus:shadow-[0_0_15px_rgba(229,169,60,0.08)] placeholder:text-zinc-600 transition-all duration-300 font-mono-ui"
                        placeholder="Search messages..."
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent relative z-10">
                {conversations.length === 0 ? (
                    <div className="p-2">
                        <EmptyState
                            icon={MessageSquare}
                            title={searchQuery ? "No matching conversations" : "No conversations yet"}
                            description={searchQuery ? `No chats matching "${searchQuery}"` : "Real-time messages from connected platforms will appear here."}
                            compact
                        />
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
                                        ? "bg-gradient-to-r from-[#e5a93c]/15 to-transparent border border-[#e5a93c]/30"
                                        : "hover:bg-white/[0.04] border border-transparent hover:border-white/[0.05]"
                                )}
                                style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms`, animationDuration: '500ms' }}
                            >
                                {isSelected && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#e5a93c] rounded-r-full shadow-[0_0_10px_rgba(229,169,60,0.5)]" />
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
                                            "text-[10px] whitespace-nowrap font-medium font-mono-ui",
                                            isSelected ? "text-[#e5a93c]" : "text-neutral-500"
                                        )}>
                                            {new Date(conv.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className={cn(
                                        "text-xs truncate transition-colors",
                                        isSelected ? "text-neutral-300" : "text-neutral-500 group-hover:text-neutral-400"
                                    )}>
                                        {conv.last_message_preview
                                            ? conv.last_message_preview.length > 40
                                                ? conv.last_message_preview.slice(0, 40) + "..."
                                                : conv.last_message_preview
                                            : "No messages yet"
                                        }
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
