import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSessionUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request)
        if (!sessionUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { recipientId, message, attachment } = body

        if (!recipientId || (!message && !attachment)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const supabase = await getSupabaseServerClient()

        // Prepare Payload for Instagram API
        const apiBody: any = { recipient: { id: recipientId } }

        if (message) {
            apiBody.message = { text: message }
        } else if (attachment) {
            apiBody.message = { attachment }
        }

        // Send to Instagram
        const res = await fetch(
            `https://graph.instagram.com/v24.0/me/messages?access_token=${sessionUser.access_token}`,
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
            .eq("user_id", sessionUser.id)
            .eq("recipient_id", recipientId)
            .single()

        if (conv) {
            await supabase.from("messages").insert({
                id: `mid_out_${Date.now()}_${Math.random()}`,
                conversation_id: conv.id,
                user_id: sessionUser.id,
                sender_id: sessionUser.business_account_id,
                sender_username: sessionUser.username,
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
