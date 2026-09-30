export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { applyIncoming, initialStepToken } from "@/lib/flows/engine"
import { workspaceSession } from "@/lib/flows/session"
import type { FlowContact, FlowGraph, FlowRunState } from "@/lib/flows/types"

/** Dry run. Nothing is sent and nothing is written. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const { id } = await params
    const body = await request.json()
    const flow = await session.supabase.from("flows").select("id, channel, draft_version_id").eq("id", id).eq("user_id", session.userId).maybeSingle()
    if (!flow.data) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const version = await session.supabase.from("flow_versions").select("graph").eq("id", flow.data.draft_version_id).maybeSingle()
    const graph = (version.data?.graph || { nodes: [], edges: [] }) as FlowGraph
    const channel = String(body.channel || flow.data.channel || "instagram")
    const contact: FlowContact = {
      channel,
      externalId: "test",
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      customFields: body.fields && typeof body.fields === "object" ? body.fields : {},
      botPaused: body.botPaused === true,
      optedIn: body.optedIn !== false,
      optedOut: body.optedOut === true,
      isFollower: typeof body.isFollower === "boolean" ? body.isFollower : null,
      lastInboundAt: new Date().toISOString(),
    }
    const runId = randomUUID()
    const run: FlowRunState = {
      id: runId,
      flowId: id,
      versionId: flow.data.draft_version_id,
      contactExternalId: "test",
      channel,
      status: "active",
      currentNodeId: null,
      waitKind: null,
      resumeAt: null,
      expectedPayloads: [],
      stepToken: initialStepToken(runId),
      steps: 0,
      context: {},
    }
    const result = applyIncoming({
      graph,
      run,
      contact,
      signal: {
        kind: "start",
        eventId: "test",
        text: String(body.text || ""),
        commentId: body.commentId ? String(body.commentId) : "comment-test",
        inboundJustNow: true,
      },
      now: Date.now(),
      tiktokEnabled: true,
      templateApproved: body.templateApproved === true,
    })
    return NextResponse.json({
      status: result.run.status,
      waitKind: result.run.waitKind,
      nodeId: result.run.currentNodeId,
      tags: result.contact.tags,
      fields: result.contact.customFields,
      effects: result.effects.map((effect) => ({ type: effect.type, nodeId: "nodeId" in effect ? effect.nodeId : undefined, reason: "reason" in effect ? effect.reason : undefined })),
    })
  } catch (error) {
    console.error("[flows] test", error)
    return NextResponse.json({ error: "Test failed" }, { status: 500 })
  }
}
