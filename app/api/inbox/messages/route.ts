import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
    try {
        const result = await requireInstagramUser(request)
        if (result.response) return result.response
        const igUserId = result.igUser.id

        const conversationId = request.nextUrl.searchParams.get("conversationId")
        if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

        const supabase = await getSupabaseBypassClient()

        // Verify that the conversation belongs to the logged-in session user first
        const { data: conv, error: convError } = await supabase
            .from("conversations")
            .select("id")
            .eq("id", conversationId)
            .eq("user_id", igUserId)
            .single()

        if (convError || !conv) {
            return NextResponse.json({ error: "Conversation not found or access denied" }, { status: 404 })
        }

        // Fetch messages for this conversation
        const { data: messages, error } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })

        if (error) throw error

        return NextResponse.json(messages)
    } catch (error) {
        console.error("[Inbox] Messages GET error:", error)
        return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
    }
}
