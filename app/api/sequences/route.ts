export const dynamic = "force-dynamic"

import { randomUUID } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { enrollContact, sequenceJobKey, type SequenceStep } from "@/lib/broadcasts/sequence"
import { contactMatchesSegment, type SegmentFilter } from "@/lib/broadcasts/plan"
import { contactFromRow } from "@/lib/contacts"
import { isMissingTable, workspaceSession } from "@/lib/flows/session"

function stepsOf(value: unknown): SequenceStep[] {
  if (!Array.isArray(value)) return []
  const steps: SequenceStep[] = []
  for (const [index, step] of value.entries()) {
    if (!step || typeof step !== "object") continue
    const row = step as SequenceStep
    steps.push({
      id: String(row.id || `step_${index + 1}`),
      delayMs: Math.max(0, Number(row.delayMs) || 0),
      text: row.text ? String(row.text).slice(0, 2000) : undefined,
      templateName: row.templateName ? String(row.templateName) : undefined,
      templateLanguage: row.templateLanguage ? String(row.templateLanguage) : undefined,
    })
  }
  return steps
}

export async function GET(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const { data, error } = await session.supabase.from("sequences").select("*").eq("user_id", session.userId).order("created_at", { ascending: false })
    if (error) {
      if (isMissingTable(error)) return NextResponse.json({ sequences: [], migration_required: true })
      throw error
    }
    return NextResponse.json({ sequences: data || [] })
  } catch (error) {
    console.error("[sequences] GET", error)
    return NextResponse.json({ error: "Failed to load sequences" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await workspaceSession(request)
    if ("response" in session && session.response) return session.response
    const body = await request.json()
    const name = String(body.name || "").trim().slice(0, 120)
    const channel = String(body.channel || "")
    const steps = stepsOf(body.steps)
    if (!name || !channel || steps.length === 0) return NextResponse.json({ error: "Name, channel, and steps are required" }, { status: 400 })
    const id = randomUUID()
    const inserted = await session.supabase.from("sequences").insert({
      id,
      workspace_id: session.workspaceId,
      user_id: session.userId,
      name,
      channel,
      segment: body.segment || { all: true, channels: [channel] },
      steps,
      status: body.enroll ? "live" : "draft",
    }).select("*").maybeSingle()
    if (inserted.error) {
      if (isMissingTable(inserted.error)) return NextResponse.json({ error: "Run the phase 5 migration first" }, { status: 503 })
      throw inserted.error
    }
    let enrolled = 0
    if (body.enroll) {
      const segment = (body.segment || { all: true, channels: [channel] }) as SegmentFilter
      const contacts = await session.supabase.from("contacts").select("*").eq("user_id", session.userId).eq("channel", channel).limit(2000)
      const now = Date.now()
      for (const row of (contacts.data || []).map(contactFromRow)) {
        if (row.opted_out) continue
        if (!contactMatchesSegment({ channel: row.channel, externalId: row.external_id, tags: row.tags, customFields: row.custom_fields }, segment)) continue
        const enrollmentId = randomUUID()
        const enrollment = enrollContact({
          id: enrollmentId,
          sequenceId: id,
          contactExternalId: row.external_id,
          channel,
          steps,
          now,
        })
        const saved = await session.supabase.from("sequence_enrollments").insert({
          id: enrollmentId,
          sequence_id: id,
          contact_id: row.id || null,
          contact_external_id: row.external_id,
          channel,
          step_index: 0,
          status: enrollment.status,
          next_send_at: enrollment.nextSendAt ? new Date(enrollment.nextSendAt).toISOString() : null,
        })
        if (saved.error) continue
        if (enrollment.nextSendAt) {
          await session.supabase.from("flow_jobs").insert({
            user_id: session.userId,
            workspace_id: session.workspaceId,
            kind: "sequence",
            idempotency_key: sequenceJobKey(enrollmentId, 0),
            contact_external_id: row.external_id,
            channel,
            payload: { enrollmentId },
            status: "pending",
            next_attempt_at: new Date(enrollment.nextSendAt).toISOString(),
          })
        }
        enrolled += 1
      }
    }
    return NextResponse.json({ sequence: inserted.data, enrolled })
  } catch (error) {
    console.error("[sequences] POST", error)
    return NextResponse.json({ error: "Failed to create sequence" }, { status: 500 })
  }
}
