import crypto from "crypto"

/**
 * TikTok signs webhook bodies with `TikTok-Signature: t=<unix>,s=<hex>`.
 * The signed payload is `${timestamp}.${rawBody}`, HMAC-SHA256, client secret.
 * https://developers.tiktok.com/doc/webhooks-verification
 */
export function verifyTikTokSignature(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
  nowSec = Math.floor(Date.now() / 1000),
  toleranceSec = 5 * 60,
): boolean {
  if (!secret || !header) return false
  const parts: Record<string, string> = {}
  for (const piece of header.split(",")) {
    const index = piece.indexOf("=")
    if (index <= 0) continue
    parts[piece.slice(0, index).trim()] = piece.slice(index + 1).trim()
  }
  const timestamp = parts.t
  const signature = parts.s
  if (!timestamp || !signature || !/^[0-9a-f]+$/i.test(signature)) return false
  const sent = Number(timestamp)
  if (!Number.isFinite(sent) || Math.abs(nowSec - sent) > toleranceSec) return false
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")
  if (expected.length !== signature.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"))
}
