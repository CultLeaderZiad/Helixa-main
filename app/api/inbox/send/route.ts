export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseBypassClient } from "@/lib/supabase-server"
import { requireSessionUser } from "@/lib/auth"
import { sendHumanMessage } from "@/lib/channels/manual-send"

export async function POST(request: NextRequest) {
  try {
    const result = await requireSessionUser(request)
    if (result.response) return result.response
    const { user: account, igUser, workspace } = result
    const igUserId = igUser?.id || account.id

    const body = await request.json()
    const recipientId = body.recipientId || body.recipient_id
    const message = body.message
    const conversationId = body.conversationId || body.conversation_id
    if (!recipientId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseBypassClient()
    let channel = typeof body.channel === "string" ? body.channel : ""
    let ownedConversation: string | null = conversationId || null
    if (conversationId) {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id, platform, recipient_id, user_id")
        .eq("id", conversationId)
        .eq("user_id", igUserId)
        .maybeSingle()
      if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      channel = conversation.platform || channel || "instagram"
      ownedConversation = conversation.id
      if (String(conversation.recipient_id) !== String(recipientId)) {
        return NextResponse.json({ error: "Recipient does not match this conversation" }, { status: 400 })
      }
    }
    if (!channel) channel = "instagram"

    const sent = await sendHumanMessage(supabase, {
      userId: igUserId,
      workspaceId: workspace?.id || igUser?.workspace_id || null,
      channel,
      recipientId: String(recipientId),
      conversationId: ownedConversation,
      text: String(message),
      username: igUser?.username || null,
    })
    if (!sent.ok) {
      return NextResponse.json(
        { error: sent.error, window: sent.window, reconnect_required: sent.reconnect || false },
        { status: sent.status },
      )
    }
    return NextResponse.json({ success: true, data: { id: sent.id }, window: sent.window })
  } catch (error) {
    console.error("[Inbox Send] Internal Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
