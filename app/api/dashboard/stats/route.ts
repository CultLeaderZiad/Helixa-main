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

        // Run all queries in parallel instead of sequentially
        const [
            automationsResult,
            activeTriggersResult,
            audienceResult,
            messagesResult,
            recentMessagesResult,
            pendingSubmissionsResult,
            subscriptionResult,
        ] = await Promise.all([
            // 1. Total Automations
            supabase
                .from("automations")
                .select("*", { count: "exact", head: true })
                .eq("user_id", igUserId),

            // 2. Active Triggers
            supabase
                .from("automations")
                .select("*", { count: "exact", head: true })
                .eq("user_id", igUserId)
                .eq("is_active", true),

            // 3. Audience Reached (Total Conversations)
            supabase
                .from("conversations")
                .select("*", { count: "exact", head: true })
                .eq("user_id", igUserId),

            // 4. Messages Sent (bot-sent)
            supabase
                .from("messages")
                .select("*", { count: "exact", head: true })
                .eq("user_id", igUserId)
                .eq("is_from_instagram", false),

            // 5. Recent Activity (Last 5 messages)
            supabase
                .from("messages")
                .select("id, content, created_at, sender_username, conversation_id, platform, recipient:conversations(recipient_username, platform)")
                .eq("user_id", igUserId)
                .eq("is_from_instagram", false)
                .order("created_at", { ascending: false })
                .limit(5),

            // 6. Pending payment submissions (merged from client-side paymentStatus)
            supabase
                .from("payment_submissions")
                .select("id")
                .eq("user_id", igUserId)
                .eq("status", "pending")
                .limit(1),

            // 7. Subscription status (merged from client-side paymentStatus)
            supabase
                .from("subscriptions")
                .select("payment_method, current_period_end")
                .eq("user_id", igUserId)
                .single(),
        ])

        // Compute payment status
        const hasPendingSubmission = !!(pendingSubmissionsResult.data && pendingSubmissionsResult.data.length > 0)
        let needsManualRenewal = false
        let daysToRenew = 0

        const sub = subscriptionResult.data
        if (sub && sub.payment_method === 'vodafone_cash' && sub.current_period_end) {
            const diff = new Date(sub.current_period_end).getTime() - Date.now()
            daysToRenew = Math.ceil(diff / (1000 * 60 * 60 * 24))
            if (daysToRenew <= 3 && daysToRenew > 0) {
                needsManualRenewal = true
            }
        }

        return NextResponse.json({
            metrics: {
                totalAutomations: automationsResult.count || 0,
                activeTriggers: activeTriggersResult.count || 0,
                audienceReached: audienceResult.count || 0,
                messagesSent: messagesResult.count || 0,
            },
            recentActivity: recentMessagesResult.data || [],
            paymentStatus: {
                hasPendingSubmission,
                needsManualRenewal,
                daysToRenew,
            },
        })
    } catch (error) {
        console.error("[v0] Dashboard Stats error:", error)
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
    }
}

