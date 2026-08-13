"use client"

import { useEffect, useState, useRef } from "react"
import { Send, Loader2, MoreVertical, Phone, Video, Zap, ChevronLeft, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Message } from "@/types/db"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

interface ChatWindowProps {
    conversationId: string | null
    recipientId?: string
    recipientName: string | null
    userId: string
    onBack?: () => void
}

export function ChatWindow({ conversationId, recipientId, recipientName, userId, onBack }: ChatWindowProps) {
    const { data: messagesData, mutate: mutateMessages, isLoading: loading } = useSWR(
        conversationId ? `/api/inbox/messages?conversationId=${conversationId}` : null,
        fetcher
    )
    const messages = Array.isArray(messagesData) ? messagesData : []

    const { data: automationsData } = useSWR(
        userId ? `/api/automations?userId=${userId}` : null,
        fetcher
    )
    const automations = Array.isArray(automationsData) ? automationsData : []

    const [inputText, setInputText] = useState("")
    const [sending, setSending] = useState(false)
    const [isAutomationOpen, setIsAutomationOpen] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSendMessage = async (text: string = inputText) => {
        if (!text.trim() || !recipientId || !userId) return

        setSending(true)
        try {
            const res = await fetch("/api/inbox/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    recipientId,
                    message: text
                })
            })

            if (res.ok) {
                setInputText("")
                // Optimistic update
                const newMsg: Message = {
                    id: `temp_${Date.now()}`,
                    conversation_id: conversationId!,
                    user_id: userId,
                    sender_id: "me",
                    sender_username: "Me",
                    content: text,
                    is_from_instagram: false,
                    created_at: new Date().toISOString()
                }
                mutateMessages((prev: any) => [...(prev || []), newMsg], false)
            }
        } catch (e) {
            console.error("Send failed", e)
        } finally {
            setSending(false)
            setIsAutomationOpen(false)
        }
    }

    if (!conversationId) {
        return (
            <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center bg-transparent h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-[#ffe14d]/[0.02] to-transparent pointer-events-none" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)] flex items-center justify-center animate-in zoom-in duration-700">
                    <Send className="w-8 h-8 text-white/40" />
                </div>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both relative z-10">
                    <h3 className="text-xl font-bold text-white mb-2">Select a Conversation</h3>
                    <p className="text-neutral-400 text-sm max-w-[260px] mx-auto leading-relaxed">
                        Choose a conversation from the sidebar to view messages and reply live.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
            {/* Background ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-[#ffe14d]/[0.03] blur-[120px] rounded-full pointer-events-none" />
            
            {/* Header */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-6 bg-white/[0.02] backdrop-blur-xl shrink-0 relative z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden -ml-2 text-neutral-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shrink-0 flex items-center justify-center">
                        <span className="text-white/60 font-bold text-xs">{recipientName?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">@{recipientName}</h3>
                        <span className="hidden md:flex items-center gap-1.5 text-[10px] text-green-400 font-medium tracking-wide">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                            </span>
                            Instagram
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {/* Actions removed as they were mockups */}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 relative z-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = !msg.is_from_instagram
                        return (
                            <div 
                                key={msg.id} 
                                className={cn(
                                    "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-500", 
                                    isMe ? "justify-end" : "justify-start"
                                )}
                                style={{ animationFillMode: 'both', animationDelay: `${index * 50}ms` }}
                            >
                                <div className={cn(
                                    "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm break-words relative overflow-hidden group",
                                    isMe
                                        ? "bg-gradient-to-br from-[#ffe14d] to-[#e6c419] text-black rounded-br-none shadow-[0_4px_20px_rgba(255,225,77,0.1)]"
                                        : "bg-white/[0.08] backdrop-blur-md text-white rounded-bl-none border border-white/10"
                                )}>
                                    {isMe && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />}
                                    <div className="relative z-10">
                                        {msg.content}
                                    </div>
                                    <div className={cn(
                                        "text-[10px] mt-1 relative z-10 opacity-70 transition-opacity group-hover:opacity-100",
                                        isMe ? "text-black/60 text-right" : "text-neutral-400"
                                    )}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Automation Popup */}
            {isAutomationOpen && (
                <div className="absolute bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-[#0a0a0a]/95 border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl p-2 z-50 animate-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 mb-1">
                        <Zap className="w-3 h-3 text-[#ffe14d]" />
                        Quick Automations
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 p-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {automations.map(auto => (
                            <button
                                key={auto.id}
                                onClick={() => handleSendMessage(auto.response_content?.message || auto.name)}
                                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 text-sm text-white transition-all group flex items-center gap-3"
                            >
                                <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <MessageSquare className="w-3 h-3 text-white/50 group-hover:text-white" />
                                </div>
                                <span className="truncate flex-1 font-medium">{auto.name}</span>
                            </button>
                        ))}
                        {automations.length === 0 && (
                            <div className="px-3 py-6 text-center text-neutral-500 text-xs">
                                No automations configured yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-3 md:p-4 border-t border-white/5 bg-white/[0.02] backdrop-blur-xl shrink-0 relative z-20">
                <div className="flex items-center gap-2 bg-black/40 rounded-2xl border border-white/10 p-1.5 focus-within:border-[#ffe14d]/50 focus-within:bg-black/60 focus-within:shadow-[0_0_20px_rgba(255,225,77,0.05)] transition-all duration-300">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsAutomationOpen(!isAutomationOpen)}
                        className={cn("h-10 w-10 hover:bg-white/10 text-neutral-400 hover:text-[#ffe14d] transition-all shrink-0 rounded-xl", isAutomationOpen && "text-[#ffe14d] bg-[#ffe14d]/10 scale-95")}
                    >
                        <Zap className={cn("w-5 h-5", isAutomationOpen && "fill-[#ffe14d]")} />
                    </Button>
                    <input
                        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white focus:outline-none placeholder:text-neutral-500 min-w-0"
                        placeholder="Type your message..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !sending) {
                                e.preventDefault()
                                handleSendMessage()
                            }
                        }}
                        disabled={sending}
                    />
                    <Button
                        onClick={() => handleSendMessage()}
                        disabled={sending || !inputText.trim()}
                        size="icon"
                        className="h-10 w-10 bg-gradient-to-br from-[#ffe14d] to-[#e6c419] hover:brightness-110 text-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-all hover:scale-105 active:scale-95 shadow-md"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                    </Button>
                </div>
            </div>
        </div>
    )
}
