export const TRIGGER_EVENT_TYPES = ["comment_dm", "dm_reply", "story_reply", "sent", "wa_reply", "ai_reply"] as const

export const VARIANT_SEND_EVENT_TYPES = ["comment_dm", "dm_reply", "story_reply", "sent", "wa_reply"] as const

export interface FunnelCounts {
  triggered: number
  sent: number
  replied: number
  linkClicked: number
  leads: number
}

export interface FunnelView {
  triggered: number
  sent: number
  replied: number
  link_clicked: number
  leads: number
}

/**
 * Every number is a count of a real row.
 * `leads` is captured emails/phones. It is not the conversation count.
 * Link clicks are redirect hits. A variant "reply" is not the bot's own send.
 */
export function buildFunnel(counts: FunnelCounts): FunnelView {
  return {
    triggered: counts.triggered,
    sent: counts.sent,
    replied: counts.replied,
    link_clicked: counts.linkClicked,
    leads: counts.leads,
  }
}

export interface VariantTally {
  id: string
  sent: number
  linkClicks: number
}

export function tallyVariantEvents(
  events: Array<{ variant_id?: string | null; event_type?: string | null }>,
): VariantTally[] {
  const counts = new Map<string, VariantTally>()
  for (const event of events) {
    if (!event.variant_id) continue
    let row = counts.get(event.variant_id)
    if (!row) {
      row = { id: event.variant_id, sent: 0, linkClicks: 0 }
      counts.set(event.variant_id, row)
    }
    if ((VARIANT_SEND_EVENT_TYPES as readonly string[]).includes(event.event_type || "")) row.sent += 1
    if (event.event_type === "link_click") row.linkClicks += 1
  }
  return [...counts.values()]
}

export interface DayBucket {
  date: string
  sent: number
  inbound: number
  linkClicks: number
}

export function bucketByDay(
  rows: Array<{ at: string; kind: "sent" | "inbound" | "click" }>,
  days: number,
  now: number,
): DayBucket[] {
  const safeDays = Math.max(1, Math.min(days, 90))
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - (safeDays - 1))
  const buckets: DayBucket[] = []
  for (let index = 0; index < safeDays; index += 1) {
    const day = new Date(start)
    day.setUTCDate(start.getUTCDate() + index)
    buckets.push({ date: day.toISOString().slice(0, 10), sent: 0, inbound: 0, linkClicks: 0 })
  }
  const byDate = new Map(buckets.map((bucket) => [bucket.date, bucket]))
  for (const row of rows) {
    const date = row.at?.slice(0, 10)
    const bucket = date ? byDate.get(date) : undefined
    if (!bucket) continue
    if (row.kind === "sent") bucket.sent += 1
    else if (row.kind === "inbound") bucket.inbound += 1
    else bucket.linkClicks += 1
  }
  return buckets
}

export function messageIsInbound(
  row: { direction?: string | null; is_from_instagram?: boolean | null; sender_id?: string | number | null },
  recipientId?: string | number | null,
): boolean {
  if (row.direction === "in") return true
  if (row.direction === "out") return false
  if (recipientId != null && row.sender_id != null && String(row.sender_id) === String(recipientId)) return true
  return row.is_from_instagram === true
}

export function historyRole(row: {
  direction?: string | null
  is_from_instagram?: boolean | null
}): "user" | "assistant" {
  return messageIsInbound(row) ? "user" : "assistant"
}
