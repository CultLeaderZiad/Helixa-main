import { FACEBOOK_GRAPH_BASE } from "@/lib/graph"
import type { FetchLike } from "@/lib/channels/types"
import { defaultFetch, graphOutcome, postJson } from "@/lib/channels/http"
import type { SendOutcome } from "@/lib/channels/types"

export interface WhatsAppTemplate {
  name: string
  language: string
  status: string
  category: string | null
  components: unknown[]
}

export function bodyParameterCount(components: unknown): number {
  if (!Array.isArray(components)) return 0
  let highest = 0
  for (const component of components) {
    if (!component || typeof component !== "object") continue
    const row = component as { type?: string; text?: string }
    if (String(row.type || "").toUpperCase() !== "BODY" || typeof row.text !== "string") continue
    for (const match of row.text.matchAll(/\{\{(\d+)\}\}/g)) {
      highest = Math.max(highest, Number(match[1]))
    }
  }
  return highest
}

export function parseTemplateList(json: any): WhatsAppTemplate[] {
  const rows = Array.isArray(json?.data) ? json.data : []
  return rows
    .map((row: any) => ({
      name: String(row?.name || ""),
      language: String(row?.language || ""),
      status: String(row?.status || ""),
      category: row?.category ? String(row.category) : null,
      components: Array.isArray(row?.components) ? row.components : [],
    }))
    .filter((row: WhatsAppTemplate) => row.name && row.language)
}

/** Cloud API template send. Approved templates are valid outside the 24h window. */
export function buildTemplatePayload(input: {
  to: string
  name: string
  language: string
  bodyParameters?: string[]
}): Record<string, unknown> {
  const parameters = (input.bodyParameters || []).filter((value) => value != null)
  const template: Record<string, unknown> = {
    name: input.name,
    language: { code: input.language },
  }
  if (parameters.length) {
    template.components = [
      {
        type: "body",
        parameters: parameters.map((value) => ({ type: "text", text: String(value) })),
      },
    ]
  }
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: input.to,
    type: "template",
    template,
  }
}

export async function sendWhatsAppTemplate(
  fetchImpl: FetchLike,
  input: {
    phoneNumberId: string
    accessToken: string
    to: string
    name: string
    language: string
    bodyParameters?: string[]
  },
): Promise<SendOutcome> {
  if (!input.phoneNumberId) return { ok: false, error: "missing_phone_number_id" }
  const result = await postJson(
    fetchImpl,
    `${FACEBOOK_GRAPH_BASE}/${input.phoneNumberId}/messages`,
    buildTemplatePayload(input),
    { Authorization: `Bearer ${input.accessToken}` },
  )
  if (result.json?.error) return graphOutcome(result.json)
  if (!result.ok) return { ok: false, error: "WhatsApp template send failed" }
  return { ok: true, id: result.json?.messages?.[0]?.id }
}

export async function listWhatsAppTemplates(
  fetchImpl: FetchLike,
  wabaId: string,
  accessToken: string,
): Promise<{ ok: true; templates: WhatsAppTemplate[] } | { ok: false; error: string }> {
  const templates: WhatsAppTemplate[] = []
  let url: string | null =
    `${FACEBOOK_GRAPH_BASE}/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100`
  let pages = 0
  while (url && pages < 10) {
    pages += 1
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    const json = await response.json().catch(() => null)
    if (!response.ok || json?.error) {
      return { ok: false, error: json?.error?.message || "Could not list WhatsApp templates" }
    }
    templates.push(...parseTemplateList(json))
    url = typeof json?.paging?.next === "string" ? json.paging.next : null
  }
  return { ok: true, templates }
}

export function defaultTemplateFetch(): FetchLike {
  return defaultFetch()
}
