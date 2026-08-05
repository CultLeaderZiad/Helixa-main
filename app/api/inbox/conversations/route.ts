import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
    try {
        const result = await requireInstagramUser(request)
        if (result.response) return result.response
        const igUserId = result.igUser.id

        const supabase = await getSupabaseBypassClient()

        // Fetch conversations sorted by last message, filtering strictly by the session user's ID
        const { data: conversations, error } = await supabase
            .from("conversations")
            .select("*")
            .eq("user_id", igUserId)
            .order("last_message_at", { ascending: false })

        if (error) throw error

        return NextResponse.json(conversations)
    } catch (error) {
        console.error("[Inbox] Conversations GET error:", error)
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }
}
