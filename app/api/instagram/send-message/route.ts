import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { getSessionUser } from "@/lib/auth"

/**
 * POST /api/instagram/send-message
 * Send a DM reply to an Instagram user
 */
export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request)
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { recipient_id, message } = await request.json()

    if (!recipient_id || !message) {
      return NextResponse.json({ error: "Missing required fields: recipient_id, message" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    console.log("[v0] Sending DM from", sessionUser.username, "to", recipient_id)

    // Send message via Instagram API
    const sendUrl = `https://graph.instagram.com/v24.0/me/messages?access_token=${encodeURIComponent(sessionUser.access_token)}`

    const response = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: {
          id: recipient_id.toString(),
        },
        message: {
          text: message,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[v0] Failed to send message:", data)
      return NextResponse.json({ error: data.error?.message || "Failed to send message" }, { status: 400 })
    }

    console.log("[v0] Message sent successfully:", data.message_id)

    // Store the sent message in database
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", sessionUser.id)
      .eq("recipient_id", recipient_id)
      .single()

    if (conversation) {
      await supabase.from("messages").insert({
        id: data.message_id,
        conversation_id: conversation.id,
        user_id: sessionUser.id,
        sender_id: sessionUser.id,
        sender_username: sessionUser.username,
        content: message,
        is_from_instagram: false,
      })
    }

    return NextResponse.json({
      success: true,
      message_id: data.message_id,
    })
  } catch (error) {
    console.error("[v0] Send message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
