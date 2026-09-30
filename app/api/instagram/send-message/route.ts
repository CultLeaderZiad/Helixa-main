export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireInstagramUser } from "@/lib/auth"
import { sendHumanMessage } from "@/lib/channels/manual-send"

export async function POST(request: NextRequest) {
  try {
    const result = await requireInstagramUser(request)
    if (result.response) return result.response
    const { recipient_id, message, conversation_id } = await request.json()
    if (!recipient_id || !message) {
      return NextResponse.json({ error: "Missing required fields: recipient_id, message" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()
    const sent = await sendHumanMessage(supabase, {
      userId: result.igUser.id,
      workspaceId: result.workspace?.id || result.igUser.workspace_id || null,
      channel: "instagram",
      recipientId: String(recipient_id),
      conversationId: conversation_id || null,
      text: String(message),
      username: result.igUser.username,
    })
    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error, window: sent.window, reconnect_required: sent.reconnect || false },
        { status: sent.status },
      )
    }
    return NextResponse.json({ success: true, message_id: sent.id, window: sent.window })
  } catch (error) {
    console.error("[v0] Send message error:", error)
    return NextResponse.json({ error: "Something went wrong sending the message. Please try again." }, { status: 500 })
  }
}
