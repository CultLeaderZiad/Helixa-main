import type { FetchLike } from "@/lib/channels/types"

export interface LeadRow {
  name: string
  email: string
  phone: string
  channel: string
  tags: string
  createdAt: string
}

export function leadRow(contact: {
  display_name?: string | null
  username?: string | null
  email?: string | null
  phone?: string | null
  channel?: string | null
  tags?: string[] | null
  first_seen_at?: string | null
}): LeadRow {
  return {
    name: contact.display_name || contact.username || "",
    email: contact.email || "",
    phone: contact.phone || "",
    channel: contact.channel || "",
    tags: (contact.tags || []).join("|"),
    createdAt: contact.first_seen_at || "",
  }
}

export function sheetsValues(rows: LeadRow[]): string[][] {
  const header = ["name", "email", "phone", "channel", "tags", "created_at"]
  return [header, ...rows.map((row) => [row.name, row.email, row.phone, row.channel, row.tags, row.createdAt])]
}

export async function appendLeadRows(input: {
  spreadsheetId: string
  sheetName: string
  accessToken: string
  rows: LeadRow[]
  fetchImpl?: FetchLike
}): Promise<{ updated: number }> {
  const fetchImpl = input.fetchImpl || fetch
  const range = encodeURIComponent(`${input.sheetName}!A1`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(input.spreadsheetId)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: sheetsValues(input.rows).slice(1) }),
  })
  const json = await (response as Response).json().catch(() => null)
  if (!response.ok) throw new Error(json?.error?.message || "Google Sheets append failed")
  return { updated: Number(json?.updates?.updatedRows || input.rows.length) }
}

export function hubspotProperties(contact: LeadRow & { extra?: Record<string, string> }): Record<string, string> {
  const [first, ...rest] = contact.name.split(" ").filter(Boolean)
  return {
    email: contact.email,
    firstname: first || contact.name || "Contact",
    lastname: rest.join(" "),
    phone: contact.phone,
    hs_lead_status: "NEW",
    lifecyclestage: "lead",
    ...contact.extra,
  }
}

export async function upsertHubspotContact(input: {
  accessToken: string
  contact: LeadRow
  fetchImpl?: FetchLike
}): Promise<{ id: string; created: boolean }> {
  const fetchImpl = input.fetchImpl || fetch
  const response = await fetchImpl("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: hubspotProperties(input.contact) }),
  })
  const json = await (response as Response).json().catch(() => null)
  if (response.ok && json?.id) return { id: String(json.id), created: true }
  if (response.status === 409 && input.contact.email) {
    const search = await fetchImpl("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: input.contact.email }] }] }),
    })
    const found = await (search as Response).json().catch(() => null)
    const id = found?.results?.[0]?.id
    if (!id) throw new Error("HubSpot contact exists but could not be found")
    const updated = await fetchImpl(`https://api.hubapi.com/crm/v3/objects/contacts/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ properties: hubspotProperties(input.contact) }),
    })
    if (!updated.ok) throw new Error("HubSpot update failed")
    return { id: String(id), created: false }
  }
  throw new Error(json?.message || "HubSpot sync failed")
}
