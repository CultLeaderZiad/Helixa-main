import crypto from "crypto"

/**
 * Compare the Authorization header to `Bearer $CRON_SECRET`.
 * A missing secret is unauthorized. Length is checked before the constant-time compare.
 */
export function isCronAuthorized(authorizationHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false
  const expected = `Bearer ${secret}`
  const actual = authorizationHeader ?? ""
  const actualBuf = Buffer.from(actual)
  const expectedBuf = Buffer.from(expected)
  if (actualBuf.length !== expectedBuf.length) return false
  return crypto.timingSafeEqual(actualBuf, expectedBuf)
}
