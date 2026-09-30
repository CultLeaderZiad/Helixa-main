export const dynamic = "force-dynamic"

import { randomUUID } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { commentToDmFlow } from "@/lib/growth/tools"
import { isMissingTable, workspaceSession } from "@/lib/flows/session"

export async function POST(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const body = await request.json()
    const built = commentToDmFlow({
      templateId: String(body.templateId || ""),
      mediaId: body.mediaId ? String(body.mediaId) : null,
      keyword: body.keyword ? String(body.keyword) : null,
      channel: body.channel ? String(body.channel) : "instagram",
    })
    if (!built) return NextResponse.json({ error: "Unknown template" }, { status: 400 })
    const automation = await session.supabase.from("automations").insert({
      user_id: session.userId,
      name: built.name,
      trigger_source: "comment",
      trigger_type: "keyword",
      trigger_value: (built.trigger.keywords || "").toLowerCase(),
      response_type: "pro",
      response_content: {
        message: built.graph.nodes.find((node) => node.id === "send")?.data.text || "",
        public_replies: built.graph.nodes.find((node) => node.id === "public")?.data.variants || [],
        reply_mode: "both",
        quick_replies: built.graph.nodes.find((node) => node.id === "send")?.data.quickReplies || [],
      },
      is_active: true,
      specific_media_id: built.trigger.mediaId || null,
      platform: built.channel,
    }).select("id").maybeSingle()
    if (automation.error) throw automation.error
    const id = randomUUID()
    const versionId = randomUUID()
    built.graph.nodes = built.graph.nodes.map((node) =>
      node.id === "trigger" ? { ...node, data: { ...node.data, trigger: built.trigger } } : node,
    )
    const flow = await session.supabase.from("flows").insert({
      id,
      workspace_id: session.workspaceId,
      user_id: session.userId,
      name: built.name,
      status: "live",
      channel: built.channel,
      trigger: built.trigger,
      draft_version_id: versionId,
      published_version_id: versionId,
      source_automation_id: automation.data?.id || null,
    })
    if (flow.error) {
      if (isMissingTable(flow.error)) {
        return NextResponse.json({ automationId: automation.data?.id, flowId: null, migration_required: true })
      }
      throw flow.error
    }
    await session.supabase.from("flow_versions").insert({
      id: versionId,
      flow_id: id,
      version: 1,
      graph: built.graph,
      published_at: new Date().toISOString(),
    })
    return NextResponse.json({ automationId: automation.data?.id, flowId: id })
  } catch (error) {
    console.error("[growth] comment-to-dm", error)
    return NextResponse.json({ error: "Failed to create the Reel flow" }, { status: 500 })
  }
}
