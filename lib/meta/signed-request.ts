import { createHmac, randomBytes, timingSafeEqual } from "crypto"

export interface MetaSignedPayload {
  user_id?: string
  userId?: string
  algorithm?: string
  issued_at?: number
}

export function decodeBase64Url(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  return Buffer.from(padded + pad, "base64")
}

export function encodeBase64Url(value: Buffer | string): string {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value)
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

/**
 * Meta signs `encoded_sig + "." + payload`, where the HMAC is SHA-256 of the
 * still-encoded payload using the app secret.
 */
export function parseSignedRequest(signedRequest: string, secret: string): MetaSignedPayload | null {
  if (!signedRequest || !secret || !signedRequest.includes(".")) return null
  const [encodedSig, payload] = signedRequest.split(".", 2)
  if (!encodedSig || !payload) return null
  let signature: Buffer
  let json: MetaSignedPayload
  try {
    signature = decodeBase64Url(encodedSig)
    json = JSON.parse(decodeBase64Url(payload).toString("utf8"))
  } catch {
    return null
  }
  if (!json || json.algorithm !== "HMAC-SHA256") return null
  const expected = createHmac("sha256", secret).update(payload).digest()
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null
  return json
}

export function signMetaRequest(payload: MetaSignedPayload, secret: string): string {
  const encoded = encodeBase64Url(JSON.stringify({ ...payload, algorithm: "HMAC-SHA256" }))
  const signature = encodeBase64Url(createHmac("sha256", secret).update(encoded).digest())
  return `${signature}.${encoded}`
}

export function metaUserId(payload: MetaSignedPayload | null): string | null {
  const id = payload?.user_id || payload?.userId
  if (!id) return null
  const text = String(id).trim()
  return text || null
}

export function confirmationCode(): string {
  return `hx_${randomBytes(9).toString("hex")}`
}

export function deletionCallbackBody(origin: string, code: string): { url: string; confirmation_code: string } {
  const base = origin.replace(/\/$/, "")
  return {
    url: `${base}/data-deletion?code=${encodeURIComponent(code)}`,
    confirmation_code: code,
  }
}

export function metaAppSecret(): string {
  return process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || ""
}
