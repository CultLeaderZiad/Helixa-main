export type JobStatus = "pending" | "processing" | "done" | "dead" | "cancelled"

export interface FlowJob {
  idempotencyKey: string
  kind: "start" | "resume" | "delay" | "broadcast" | "sequence"
  runId?: string | null
  flowId?: string | null
  nodeId?: string | null
  stepToken?: string | null
  contactExternalId: string
  channel: string
  payload: Record<string, unknown>
  status: JobStatus
  attempts: number
  nextAttemptAt: number
  lockedAt: number | null
}

export function enqueueJob(jobs: FlowJob[], job: FlowJob): { jobs: FlowJob[]; duplicate: boolean } {
  if (jobs.some((row) => row.idempotencyKey === job.idempotencyKey)) {
    return { jobs, duplicate: true }
  }
  return { jobs: [...jobs, job], duplicate: false }
}

/**
 * Claim due rows the way `claim_flow_jobs` does: pending and already due,
 * oldest first, skipped when another worker holds the lock.
 */
export function claimDueJobs(
  jobs: FlowJob[],
  now: number,
  limit: number,
): { jobs: FlowJob[]; claimed: FlowJob[] } {
  const claimed: FlowJob[] = []
  const next = jobs.map((job) => ({ ...job }))
  const due = next
    .filter((job) => job.status === "pending" && job.nextAttemptAt <= now && job.lockedAt == null)
    .sort((a, b) => a.nextAttemptAt - b.nextAttemptAt)
  for (const job of due) {
    if (claimed.length >= limit) break
    job.status = "processing"
    job.lockedAt = now
    claimed.push(job)
  }
  return { jobs: next, claimed }
}

export function finishJob(jobs: FlowJob[], idempotencyKey: string, status: JobStatus = "done"): FlowJob[] {
  return jobs.map((job) =>
    job.idempotencyKey === idempotencyKey ? { ...job, status, lockedAt: null } : job,
  )
}

export function rescheduleJob(jobs: FlowJob[], idempotencyKey: string, nextAttemptAt: number): FlowJob[] {
  return jobs.map((job) =>
    job.idempotencyKey === idempotencyKey
      ? { ...job, status: "pending", lockedAt: null, nextAttemptAt }
      : job,
  )
}

export interface SegmentFilter {
  all?: boolean
  channels?: string[]
  tags?: string[]
  tagMode?: "all" | "any"
  fields?: Array<{ key: string; op: "eq" | "neq" | "contains" | "exists"; value?: string }>
}

export interface SegmentContact {
  id?: string
  channel: string
  externalId: string
  tags: string[]
  customFields: Record<string, string>
  optedIn?: boolean
  optedOut?: boolean
  lastInboundAt?: string | null
}

export function contactMatchesSegment(contact: SegmentContact, segment: SegmentFilter): boolean {
  const hasConstraint = Boolean(segment.all || segment.channels?.length || segment.tags?.length || segment.fields?.length)
  if (!hasConstraint) return false
  if (segment.channels?.length && !segment.channels.includes(contact.channel)) return false
  if (segment.tags?.length) {
    const tags = contact.tags.map((tag) => tag.toLowerCase())
    const wanted = segment.tags.map((tag) => tag.toLowerCase())
    if ((segment.tagMode || "any") === "all") {
      if (!wanted.every((tag) => tags.includes(tag))) return false
    } else if (!wanted.some((tag) => tags.includes(tag))) {
      return false
    }
  }
  for (const field of segment.fields || []) {
    const value = contact.customFields[field.key]
    if (field.op === "exists") {
      if (!value) return false
      continue
    }
    if (value == null) return false
    const expected = (field.value || "").toLowerCase()
    const actual = value.toLowerCase()
    if (field.op === "eq" && actual !== expected) return false
    if (field.op === "neq" && actual === expected) return false
    if (field.op === "contains" && !actual.includes(expected)) return false
  }
  return true
}

const RECIPIENT_ORDER = ["queued", "sent", "delivered", "opened", "clicked"]

export function nextRecipientStatus(
  current: string,
  signal: "sent" | "delivered" | "opened" | "clicked" | "failed" | "skipped" | "opted_out",
): string {
  if (current === "opted_out") return "opted_out"
  if (signal === "failed" || signal === "skipped" || signal === "opted_out") {
    if (current === "clicked" || current === "opened") return current
    return signal
  }
  const currentRank = RECIPIENT_ORDER.indexOf(current)
  const nextRank = RECIPIENT_ORDER.indexOf(signal)
  if (currentRank === -1) return signal
  return nextRank >= currentRank ? signal : current
}

export function rollupBroadcast(statuses: string[]): {
  queued: number
  sent: number
  delivered: number
  opened: number
  clicked: number
  skipped: number
  failed: number
  optedOut: number
} {
  const stats = { queued: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, skipped: 0, failed: 0, optedOut: 0 }
  for (const status of statuses) {
    if (status === "queued") stats.queued += 1
    else if (status === "failed") stats.failed += 1
    else if (status === "skipped") stats.skipped += 1
    else if (status === "opted_out") stats.optedOut += 1
    else if (status === "sent" || status === "delivered" || status === "opened" || status === "clicked") {
      stats.sent += 1
      stats.delivered += 1
      if (status === "opened" || status === "clicked") stats.opened += 1
      if (status === "clicked") stats.clicked += 1
    }
  }
  return stats
}

export interface BroadcastPlanInput {
  broadcastId: string
  channel: string
  contacts: Array<
    SegmentContact & {
      optedIn: boolean
      optedOut: boolean
      lastInboundAt: string | null
    }
  >
  segment: SegmentFilter
  now: number
  scheduledAt?: number | null
  perMinute: number
  templateName?: string | null
  templateApproved?: boolean
  messageTag?: string | null
}

export interface BroadcastPlan {
  jobs: FlowJob[]
  skipped: Array<{ externalId: string; reason: string }>
}

export function planBroadcast(input: BroadcastPlanInput, decide: (contact: BroadcastPlanInput["contacts"][number]) => { allowed: boolean; reason?: string }): BroadcastPlan {
  const audience = input.contacts.filter(
    (contact) => contact.channel === input.channel && contactMatchesSegment(contact, input.segment),
  )
  const rate = Math.min(600, Math.max(1, Math.floor(input.perMinute || 30)))
  const spacing = Math.floor(60_000 / rate)
  const start = Math.max(input.now, input.scheduledAt || input.now)
  const jobs: FlowJob[] = []
  const skipped: BroadcastPlan["skipped"] = []
  let index = 0
  for (const contact of audience) {
    const decision = decide(contact)
    if (!decision.allowed) {
      skipped.push({ externalId: contact.externalId, reason: decision.reason || "blocked" })
      continue
    }
    jobs.push({
      idempotencyKey: `broadcast:${input.broadcastId}:${contact.externalId}`,
      kind: "broadcast",
      contactExternalId: contact.externalId,
      channel: input.channel,
      payload: { broadcastId: input.broadcastId, contactId: contact.id || null },
      status: "pending",
      attempts: 0,
      nextAttemptAt: start + index * spacing,
      lockedAt: null,
    })
    index += 1
  }
  return { jobs, skipped }
}
