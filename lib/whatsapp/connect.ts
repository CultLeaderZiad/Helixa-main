import { FACEBOOK_GRAPH_BASE } from "@/lib/graph"
import type { FetchLike } from "@/lib/channels/types"
import { defaultFetch, postJson } from "@/lib/channels/http"

export interface WhatsAppNumber {
  phoneNumberId: string
  wabaId: string | null
  displayPhoneNumber: string | null
  verifiedName: string | null
  qualityRating: string | null
}

function appCredentials(): { appId: string; secret: string } | null {
  const appId =
    process.env.FACEBOOK_APP_ID ||
    process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ||
    process.env.INSTAGRAM_APP_ID ||
    process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID ||
    ""
  const secret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || ""
  if (!appId || !secret) return null
  return { appId, secret }
}

export async function exchangeEmbeddedSignupCode(
  code: string,
  fetchImpl: FetchLike = defaultFetch(),
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const creds = appCredentials()
  if (!creds) return { ok: false, error: "Meta app id and secret are not configured" }
  const url = new URL(`${FACEBOOK_GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set("client_id", creds.appId)
  url.searchParams.set("client_secret", creds.secret)
  url.searchParams.set("code", code)
  const response = await fetchImpl(url.toString())
  const json = await response.json().catch(() => null)
  if (!json?.access_token) return { ok: false, error: json?.error?.message || "WhatsApp code exchange failed" }
  return { ok: true, accessToken: String(json.access_token) }
}

/** WABA ids granted on an Embedded Signup token, from debug_token granular scopes. */
export function wabaIdsFromDebugToken(json: any): string[] {
  const scopes = json?.data?.granular_scopes || json?.granular_scopes || []
  const ids = new Set<string>()
  for (const scope of scopes) {
    const name = String(scope?.scope || "")
    if (!name.includes("whatsapp_business")) continue
    for (const id of scope?.target_ids || []) {
      if (id) ids.add(String(id))
    }
  }
  return [...ids]
}

export async function debugTokenWabaIds(accessToken: string, fetchImpl: FetchLike = defaultFetch()): Promise<string[]> {
  const creds = appCredentials()
  if (!creds) return []
  const url = new URL(`${FACEBOOK_GRAPH_BASE}/debug_token`)
  url.searchParams.set("input_token", accessToken)
  url.searchParams.set("access_token", `${creds.appId}|${creds.secret}`)
  const response = await fetchImpl(url.toString())
  const json = await response.json().catch(() => null)
  return wabaIdsFromDebugToken(json)
}

export async function fetchPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  fetchImpl: FetchLike = defaultFetch(),
): Promise<WhatsAppNumber | null> {
  const url = new URL(`${FACEBOOK_GRAPH_BASE}/${phoneNumberId}`)
  url.searchParams.set("fields", "display_phone_number,verified_name,quality_rating")
  const response = await fetchImpl(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await response.json().catch(() => null)
  if (!response.ok || json?.error || !json?.id && !phoneNumberId) return null
  if (json?.error) return null
  return {
    phoneNumberId: String(json.id || phoneNumberId),
    wabaId: null,
    displayPhoneNumber: json.display_phone_number ? String(json.display_phone_number) : null,
    verifiedName: json.verified_name ? String(json.verified_name) : null,
    qualityRating: json.quality_rating ? String(json.quality_rating) : null,
  }
}

export async function listWabaPhoneNumbers(
  wabaId: string,
  accessToken: string,
  fetchImpl: FetchLike = defaultFetch(),
): Promise<WhatsAppNumber[]> {
  const url = new URL(`${FACEBOOK_GRAPH_BASE}/${wabaId}/phone_numbers`)
  url.searchParams.set("fields", "id,display_phone_number,verified_name,quality_rating")
  const response = await fetchImpl(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } })
  const json = await response.json().catch(() => null)
  if (!response.ok || json?.error || !Array.isArray(json?.data)) return []
  return json.data
    .filter((row: any) => row?.id)
    .map((row: any) => ({
      phoneNumberId: String(row.id),
      wabaId,
      displayPhoneNumber: row.display_phone_number ? String(row.display_phone_number) : null,
      verifiedName: row.verified_name ? String(row.verified_name) : null,
      qualityRating: row.quality_rating ? String(row.quality_rating) : null,
    }))
}

/** Subscribe this app to the WABA so message webhooks are delivered. */
export async function subscribeWaba(
  wabaId: string,
  accessToken: string,
  fetchImpl: FetchLike = defaultFetch(),
): Promise<boolean> {
  const result = await postJson(
    fetchImpl,
    `${FACEBOOK_GRAPH_BASE}/${wabaId}/subscribed_apps`,
    {},
    { Authorization: `Bearer ${accessToken}` },
  )
  return Boolean(result.ok && result.json?.success !== false && !result.json?.error)
}
