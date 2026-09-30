export interface ContactRecord {
  id?: string
  workspace_id?: string | null
  user_id: string | number
  channel: string
  external_id: string
  display_name?: string | null
  username?: string | null
  tags: string[]
  custom_fields: Record<string, string>
  source?: string | null
  source_automation_id?: string | null
  first_seen_at: string
  last_seen_at: string
  last_inbound_at?: string | null
  bot_paused: boolean
  opted_in?: boolean
  opted_out?: boolean
  is_follower?: boolean | null
  email?: string | null
  phone?: string | null
}

export interface ContactTouch {
  workspaceId?: string | null
  userId: string | number
  channel: string
  externalId: string
  displayName?: string | null
  username?: string | null
  source?: string | null
  sourceAutomationId?: string | null
  email?: string | null
  phone?: string | null
  customFields?: Record<string, string>
  inboundAt?: string | null
}

export function isBotPaused(contact: { bot_paused?: boolean | null } | null | undefined): boolean {
  return contact?.bot_paused === true
}

export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const tags: string[] = []
  for (const item of value) {
    if (typeof item !== "string") continue
    const tag = item.trim().slice(0, 40)
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    tags.push(tag)
    if (tags.length >= 20) break
  }
  return tags
}

export function normalizeCustomFields(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const fields: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const name = key.trim().slice(0, 40)
    if (!name) continue
    if (typeof raw !== "string" && typeof raw !== "number" && typeof raw !== "boolean") continue
    fields[name] = String(raw).slice(0, 500)
    if (Object.keys(fields).length >= 30) break
  }
  return fields
}

/**
 * First seen, tags, pause, and the original source stay put.
 * A later message only moves last seen and last inbound.
 */
export function mergeContactTouch(
  existing: ContactRecord | null,
  touch: ContactTouch,
  nowIso: string,
): ContactRecord {
  const customFields = {
    ...(existing?.custom_fields || {}),
    ...(touch.customFields || {}),
  }
  return {
    id: existing?.id,
    workspace_id: existing?.workspace_id ?? touch.workspaceId ?? null,
    user_id: existing?.user_id ?? touch.userId,
    channel: touch.channel,
    external_id: touch.externalId,
    display_name: touch.displayName || existing?.display_name || null,
    username: touch.username || existing?.username || null,
    tags: existing?.tags?.length ? existing.tags : [],
    custom_fields: customFields,
    source: existing?.source || touch.source || null,
    source_automation_id: existing?.source_automation_id || touch.sourceAutomationId || null,
    first_seen_at: existing?.first_seen_at || nowIso,
    last_seen_at: nowIso,
    last_inbound_at: touch.inboundAt || existing?.last_inbound_at || null,
    bot_paused: existing?.bot_paused === true,
    email: touch.email || existing?.email || null,
    phone: touch.phone || existing?.phone || null,
  }
}

export function filterContacts(
  contacts: ContactRecord[],
  input: { query?: string | null; tag?: string | null },
): ContactRecord[] {
  const query = (input.query || "").trim().toLowerCase()
  const tag = (input.tag || "").trim().toLowerCase()
  return contacts.filter((contact) => {
    if (tag && !contact.tags.some((item) => item.toLowerCase() === tag)) return false
    if (!query) return true
    const custom = Object.entries(contact.custom_fields || {})
      .map(([key, value]) => `${key} ${value}`)
      .join(" ")
    const haystack = [
      contact.display_name,
      contact.username,
      contact.external_id,
      contact.email,
      contact.phone,
      contact.source,
      contact.channel,
      ...(contact.tags || []),
      custom,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return haystack.includes(query)
  })
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function contactsToCsv(contacts: ContactRecord[]): string {
  const header = [
    "channel",
    "external_id",
    "display_name",
    "username",
    "tags",
    "email",
    "phone",
    "source",
    "first_seen_at",
    "last_seen_at",
    "last_inbound_at",
    "bot_paused",
    "custom_fields",
  ]
  const lines = [header.join(",")]
  for (const contact of contacts) {
    lines.push(
      [
        contact.channel,
        contact.external_id,
        contact.display_name,
        contact.username,
        contact.tags.join("|"),
        contact.email,
        contact.phone,
        contact.source,
        contact.first_seen_at,
        contact.last_seen_at,
        contact.last_inbound_at,
        contact.bot_paused ? "true" : "false",
        JSON.stringify(contact.custom_fields || {}),
      ]
        .map(csvCell)
        .join(","),
    )
  }
  return lines.join("\n")
}

export function contactFromRow(row: any): ContactRecord {
  return {
    id: row.id,
    workspace_id: row.workspace_id ?? null,
    user_id: row.user_id,
    channel: row.channel,
    external_id: row.external_id,
    display_name: row.display_name ?? null,
    username: row.username ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    custom_fields: normalizeCustomFields(row.custom_fields),
    source: row.source ?? null,
    source_automation_id: row.source_automation_id ?? null,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    last_inbound_at: row.last_inbound_at ?? null,
    bot_paused: row.bot_paused === true,
    opted_in: row.opted_in === true,
    opted_out: row.opted_out === true,
    is_follower: typeof row.is_follower === "boolean" ? row.is_follower : null,
    email: row.email ?? null,
    phone: row.phone ?? null,
  }
}
