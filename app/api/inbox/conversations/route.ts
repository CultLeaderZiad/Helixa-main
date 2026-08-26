export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
    try {
        const result = await requireSessionUser(request)
        if (result.response) return result.response
        const { user: account, igUser } = result
    const igUserId = igUser?.id || account.id

        const supabase = await getSupabaseBypassClient()

        // Fetch conversations sorted by last message
        const { data: conversations, error } = await supabase
            .from("conversations")
            .select("*")
            .eq("user_id", igUserId)
            .order("last_message_at", { ascending: false })

        if (error) throw error

        // Fetch last message for each conversation to show preview
        const convIds = (conversations || []).map((c: any) => c.id)
        let lastMessages: Record<string, string> = {}

        if (convIds.length > 0) {
            // Get the latest message per conversation using a subquery
            const { data: msgs } = await supabase
                .from("messages")
                .select("conversation_id, content")
                .in("conversation_id", convIds)
                .order("created_at", { ascending: false })
                .limit(convIds.length * 3) // Fetch a few per conversation

            if (msgs) {
                // Keep only the first (most recent) message per conversation
                for (const msg of msgs) {
                    if (!lastMessages[msg.conversation_id]) {
                        lastMessages[msg.conversation_id] = msg.content
                    }
                }
            }
        }

        // Enrich conversations with last message preview
        const enriched = (conversations || []).map((c: any) => ({
            ...c,
            last_message_preview: lastMessages[c.id] || null,
        }))

        return NextResponse.json(enriched)
    } catch (error) {
        console.error("[Inbox] Conversations GET error:", error)
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }
}

