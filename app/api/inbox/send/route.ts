export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
    try {
        const result = await requireUser(request)
        if (result.response) return result.response
        const igUserId = result.user.id

        const body = await request.json()
        const { recipientId, message, attachment } = body

        if (!recipientId || (!message && !attachment)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const supabase = await getSupabaseBypassClient()

        // Prepare Payload for Instagram API
        const apiBody: any = { recipient: { id: recipientId } }

        if (message) {
            apiBody.message = { text: message }
        } else if (attachment) {
            apiBody.message = { attachment }
        }

        // Fetch Instagram user data for API call
        const { data: igUserData } = await supabase
            .from("users")
            .select("access_token, business_account_id, username")
            .eq("id", igUserId)
            .single()

        if (!igUserData?.access_token) {
            return NextResponse.json({ error: "Instagram not connected" }, { status: 400 })
        }

        // Send to Instagram
        const res = await fetch(
            `https://graph.instagram.com/v24.0/me/messages?access_token=${igUserData.access_token}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiBody)
            }
        )

        const data = await res.json()

        if (data.error) {
            console.error("[Inbox Send] Instagram API Error:", data.error)
            return NextResponse.json({ error: data.error.message }, { status: 500 })
        }

        // Log to Database (Outbound Message)
        let { data: conv } = await supabase
            .from("conversations")
            .select("id")
            .eq("user_id", igUserId)
            .eq("recipient_id", recipientId)
            .single()

        if (conv) {
            await supabase.from("messages").insert({
                id: `mid_out_${Date.now()}_${Math.random()}`,
                conversation_id: conv.id,
                user_id: igUserId,
                sender_id: igUserData.business_account_id,
                sender_username: igUserData.username,
                content: message || "[Attachment]",
                is_from_instagram: false
            })

            // Update conversation timestamp
            await supabase
                .from("conversations")
                .update({ last_message_at: new Date().toISOString() })
                .eq("id", conv.id)
        }

        return NextResponse.json({ success: true, data })

    } catch (error) {
        console.error("[Inbox Send] Internal Error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

