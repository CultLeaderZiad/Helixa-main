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

        // 1. Total Automations
        const { count: automationsCount } = await supabase
            .from("automations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", sessionUser.id)

        // 2. Active Triggers
        const { count: activeTriggersCount } = await supabase
            .from("automations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", sessionUser.id)
            .eq("is_active", true)

        // 3. Audience Reached (Total Conversations)
        const { count: audienceCount } = await supabase
            .from("conversations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", sessionUser.id)

        // 4. Messages Sent (where is_from_instagram is false, implying bot/system sent it)
        const { count: messagesSentCount } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("user_id", sessionUser.id)
            .eq("is_from_instagram", false)

        // 5. Recent Activity (Last 5 messages sent by bot)
        const { data: recentMessages } = await supabase
            .from("messages")
            .select("id, content, created_at, sender_username, conversation_id, recipient:conversations(recipient_username)")
            .eq("user_id", sessionUser.id)
            .eq("is_from_instagram", false)
            .order("created_at", { ascending: false })
            .limit(5)

        return NextResponse.json({
            metrics: {
                totalAutomations: automationsCount || 0,
                activeTriggers: activeTriggersCount || 0,
                audienceReached: audienceCount || 0,
                messagesSent: messagesSentCount || 0,
            },
            recentActivity: recentMessages || []
        })
    } catch (error) {
        console.error("[v0] Dashboard Stats error:", error)
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }
}
