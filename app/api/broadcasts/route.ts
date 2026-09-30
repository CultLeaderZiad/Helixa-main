export const dynamic = "force-dynamic"

import { randomUUID } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { planBroadcast, rollupBroadcast, type SegmentFilter } from "@/lib/broadcasts/plan"
import { contactFromRow } from "@/lib/contacts"
import { evaluateBroadcastCompliance, isBroadcastTag } from "@/lib/flows/policy"
import { isMissingTable, workspaceSession } from "@/lib/flows/session"
import { accountIdForProfile, assertWithinLimit, incrementMeter, limitPayload, loadAccount, PlanLimitError } from "@/lib/billing/enforce"

async function approved(supabase: any, userId: string | number, name: string | null | undefined): Promise<boolean> {
  if (!name) return false
  const { data } = await supabase.from("whatsapp_templates").select("status").eq("user_id", userId).eq("name", name).limit(1)
  return String(data?.[0]?.status || "").toUpperCase() === "APPROVED"
}

export async function GET(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const { data, error } = await session.supabase.from("broadcasts").select("*").eq("user_id", session.userId).order("created_at", { ascending: false }).limit(50)
    if (error) {
      if (isMissingTable(error)) return NextResponse.json({ broadcasts: [], migration_required: true })
      throw error
    }
    return NextResponse.json({ broadcasts: data || [] })
  } catch (error) {
    console.error("[broadcasts] GET", error)
    return NextResponse.json({ error: "Failed to load broadcasts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const body = await request.json()
    const name = String(body.name || "").trim().slice(0, 120)
    const channel = String(body.channel || "")
    if (!name || !channel) return NextResponse.json({ error: "Name and channel are required" }, { status: 400 })
    const messageTag = typeof body.messageTag === "string" ? body.messageTag.trim() : ""
    if (messageTag && !isBroadcastTag(messageTag)) {
      return NextResponse.json({ error: "That message tag is no longer supported. HUMAN_AGENT is the only tag, and only through 7 days." }, { status: 400 })
    }
    const accountId = await accountIdForProfile(session.supabase, session.userId)
    const account = accountId ? await loadAccount(session.supabase, accountId) : null
    if (account) {
      try {
        await assertWithinLimit(session.supabase, account, "broadcasts", 1)
      } catch (error) {
        if (error instanceof PlanLimitError) return NextResponse.json(limitPayload(error), { status: 402 })
        throw error
      }
    }
    const segment = (body.segment || {}) as SegmentFilter
    const id = randomUUID()
    const inserted = await session.supabase.from("broadcasts").insert({
      id,
      workspace_id: session.workspaceId,
      user_id: session.userId,
      name,
      channel,
      segment,
      content: body.content || { message: String(body.text || "") },
      template_name: body.templateName || null,
      template_language: body.templateLanguage || null,
      message_tag: messageTag || null,
      status: "draft",
      scheduled_at: body.scheduledAt || null,
      per_minute: Math.min(600, Math.max(1, Number(body.perMinute) || 30)),
    }).select("id").maybeSingle()
    if (inserted.error) {
      if (isMissingTable(inserted.error)) return NextResponse.json({ error: "Run the phase 5 migration first" }, { status: 503 })
      throw inserted.error
    }
    if (account) await incrementMeter(session.supabase, account.id, "broadcasts", 1)
    if (body.send !== true) return NextResponse.json({ id })

    const contacts = await session.supabase.from("contacts").select("*").eq("user_id", session.userId).limit(2000)
    if (contacts.error) throw contacts.error
    const rows = (contacts.data || []).map(contactFromRow)
    const templateOk = await approved(session.supabase, session.userId, body.templateName)
    const now = Date.now()
    const scheduledAt = body.scheduledAt ? Date.parse(body.scheduledAt) : now
    const plan = planBroadcast(
      {
        broadcastId: id,
        channel,
        contacts: rows.map((row) => ({
          id: row.id,
          channel: row.channel,
          externalId: row.external_id,
          tags: row.tags,
          customFields: row.custom_fields,
          optedIn: row.opted_in === true,
          optedOut: row.opted_out === true,
          lastInboundAt: row.last_inbound_at || null,
        })),
        segment,
        now,
        scheduledAt,
        perMinute: Number(body.perMinute) || 30,
        templateName: body.templateName || null,
        templateApproved: templateOk,
        messageTag: messageTag || null,
      },
      (contact) =>
        evaluateBroadcastCompliance({
          channel,
          now,
          lastInboundAt: contact.lastInboundAt,
          optedIn: contact.optedIn,
          optedOut: contact.optedOut,
          templateName: body.templateName || null,
          templateApproved: templateOk,
          messageTag: messageTag || null,
        }),
    )
    for (const skipped of plan.skipped) {
      await session.supabase.from("broadcast_recipients").insert({
        broadcast_id: id,
        contact_external_id: skipped.externalId,
        channel,
        status: "skipped",
        skip_reason: skipped.reason,
        idempotency_key: `broadcast:${id}:${skipped.externalId}`,
      })
    }
    for (const job of plan.jobs) {
      await session.supabase.from("broadcast_recipients").insert({
        broadcast_id: id,
        contact_id: job.payload.contactId || null,
        contact_external_id: job.contactExternalId,
        channel,
        status: "queued",
        idempotency_key: job.idempotencyKey,
      })
      await session.supabase.from("flow_jobs").insert({
        user_id: session.userId,
        workspace_id: session.workspaceId,
        kind: "broadcast",
        idempotency_key: job.idempotencyKey,
        contact_external_id: job.contactExternalId,
        channel,
        payload: job.payload,
        status: "pending",
        next_attempt_at: new Date(job.nextAttemptAt).toISOString(),
      })
    }
    const stats = rollupBroadcast([...plan.jobs.map(() => "queued"), ...plan.skipped.map(() => "skipped")])
    await session.supabase.from("broadcasts").update({
      status: scheduledAt > now + 1000 ? "scheduled" : "sending",
      stats,
      updated_at: new Date().toISOString(),
    }).eq("id", id)
    return NextResponse.json({ id, queued: plan.jobs.length, skipped: plan.skipped })
  } catch (error) {
    console.error("[broadcasts] POST", error)
    return NextResponse.json({ error: "Failed to create broadcast" }, { status: 500 })
  }
}
