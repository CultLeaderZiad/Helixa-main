/**
 * Embedded Signup v4 session handling.
 *
 * Meta's implementation guide (24 Jul 2026) launches v4 with
 * `FB.login({ config_id, response_type: "code", override_default_response_type: true, extras: { setup: {} } })`.
 * It does not send `sessionInfoVersion`. That field is how v2 requested a
 * session payload; v2 and v3 are deprecated on 15 Oct 2026. The v4 flow is
 * selected by the Facebook Login for Business configuration id, not by a
 * version flag in `extras`. The versions page also says the v4 extras object
 * is purposely empty of version selectors.
 *
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/implementation/
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/versions
 */

export const WHATSAPP_REGISTRATION_PIN_KEY = "registration_pin"

const FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_ONLY_WABA",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
  "FINISH_OBO_MIGRATION",
  "FINISH_GRANT_ONLY_API_ACCESS",
])

export interface EmbeddedSignupLoginOptions {
  config_id: string
  response_type: "code"
  override_default_response_type: true
  extras: { setup: Record<string, never> }
}

export function embeddedSignupLoginOptions(configId: string): EmbeddedSignupLoginOptions {
  return {
    config_id: configId,
    response_type: "code",
    override_default_response_type: true,
    extras: { setup: {} },
  }
}

export type EmbeddedSignupParseResult =
  | { kind: "ignore" }
  | { kind: "session"; event: string; phoneNumberId?: string; wabaId?: string }
  | { kind: "cancel"; step?: string; message?: string }
  | { kind: "unknown"; shape: string; phoneNumberId?: string; wabaId?: string }

const seenShapes = new Set<string>()

export function resetEmbeddedSignupShapeLog(): void {
  seenShapes.clear()
}

/** Returns true the first time this shape is seen. */
export function logUnknownEmbeddedSignupOnce(shape: string): boolean {
  if (seenShapes.has(shape)) return false
  seenShapes.add(shape)
  console.warn("[whatsapp] unrecognized Embedded Signup message shape", shape)
  return true
}

export function parseEmbeddedSignupMessage(raw: unknown): EmbeddedSignupParseResult {
  let message: unknown = raw
  if (typeof message === "string") {
    try {
      message = JSON.parse(message)
    } catch {
      return { kind: "ignore" }
    }
  }
  if (!message || typeof message !== "object" || Array.isArray(message)) return { kind: "ignore" }
  const record = message as Record<string, unknown>
  if (record.type !== "WA_EMBEDDED_SIGNUP") return { kind: "ignore" }

  const event = typeof record.event === "string" ? record.event : ""
  const payload = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : null
  const phoneNumberId = pickId(payload, ["phone_number_id", "phoneNumberId"]) || pickId(record, ["phone_number_id", "phoneNumberId"])
  const wabaId = pickId(payload, ["waba_id", "wabaId"])
    || firstListedId(payload?.waba_ids)
    || firstListedId(payload?.wabaIds)
    || pickId(record, ["waba_id", "wabaId"])

  if (event === "CANCEL" || event === "ERROR") {
    const step = typeof payload?.current_step === "string" ? payload.current_step : undefined
    const errorMessage = typeof payload?.error_message === "string" ? payload.error_message.trim() : ""
    return { kind: "cancel", step, message: errorMessage || undefined }
  }

  if (FINISH_EVENTS.has(event)) {
    if (!phoneNumberId && !wabaId && event !== "FINISH_ONLY_WABA") {
      return { kind: "unknown", shape: messageShape(event, payload), phoneNumberId, wabaId }
    }
    return { kind: "session", event, phoneNumberId, wabaId }
  }

  return { kind: "unknown", shape: messageShape(event, payload), phoneNumberId, wabaId }
}

export function metadataWithoutRegistrationPin(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  const copy = { ...(metadata as Record<string, unknown>) }
  delete copy[WHATSAPP_REGISTRATION_PIN_KEY]
  return copy
}

function pickId(source: Record<string, unknown> | null | undefined, keys: string[]): string | undefined {
  if (!source) return undefined
  for (const key of keys) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isSafeInteger(value)) return String(value)
  }
  return undefined
}

function firstListedId(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim()) return entry.trim()
    if (typeof entry === "number" && Number.isSafeInteger(entry)) return String(entry)
  }
  return undefined
}

function messageShape(event: string, payload: Record<string, unknown> | null): string {
  const keys = payload ? Object.keys(payload).sort().join(",") : ""
  return `event=${event || "missing"} keys=${keys}`
}
