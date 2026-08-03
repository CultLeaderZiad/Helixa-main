import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSessionUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request)
        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await getSupabaseServerClient()

        // Fetch conversations sorted by last message, filtering strictly by the session user's ID
        const { data: conversations, error } = await supabase
            .from("conversations")
            .select("*")
            .eq("user_id", sessionUser.id)
            .order("last_message_at", { ascending: false })

        if (error) throw error

        return NextResponse.json(conversations)
    } catch (error) {
        console.error("[Inbox] Conversations GET error:", error)
        return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }
}
