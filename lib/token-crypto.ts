import { decryptString, encryptString } from "@/lib/crypto"

/** Prefix for tokens sealed by this app. Legacy ciphertext has no prefix. */
export const TOKEN_SEAL_PREFIX = "enc:v1:"

const PLACEHOLDER_TOKENS = new Set([
  "facebook_managed",
  "telegram_managed",
  "workspace_managed",
  "TEST_TOKEN_NOT_REAL",
])

export function isPlaceholderToken(token: string | null | undefined): boolean {
  return !token || PLACEHOLDER_TOKENS.has(token)
}

export function isSealedAccessToken(value: string): boolean {
  return value.startsWith(TOKEN_SEAL_PREFIX)
}

/**
 * The previous ciphertext format is `iv:authTag:payload`, with a 12-byte IV
 * and a 16-byte GCM tag. Plain Meta tokens do not match that shape.
 * Telegram tokens saved before the prefix was introduced do.
 */
export function looksLikeLegacyCiphertext(value: string): boolean {
  const parts = value.split(":")
  if (parts.length !== 3) return false
  const [iv, tag, data] = parts
  if (!iv || !tag || !data) return false
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(iv) || !/^[A-Za-z0-9+/]+={0,2}$/.test(tag)) return false
  const ivBuf = Buffer.from(iv, "base64")
  const tagBuf = Buffer.from(tag, "base64")
  return ivBuf.length === 12 && tagBuf.length === 16
}

export function sealAccessToken(plain: string): string {
  if (isPlaceholderToken(plain)) return plain
  if (isSealedAccessToken(plain)) return plain
  return TOKEN_SEAL_PREFIX + encryptString(plain)
}

/**
 * Read a stored access token.
 * - `enc:v1:` values must decrypt. Failure throws (fail closed).
 * - Legacy 3-part ciphertext is decrypted when the key works.
 * - Anything else is treated as pre-encryption plaintext so existing rows
 *   keep working until a write path or the refresh job reseals them.
 */
export function openAccessToken(stored: string | null | undefined): string | null {
  if (!stored) return null
  if (isPlaceholderToken(stored)) return stored
  if (isSealedAccessToken(stored)) {
    const plain = decryptString(stored.slice(TOKEN_SEAL_PREFIX.length))
    if (!plain) {
      throw new Error("Failed to decrypt a sealed access token. Check BYOK_ENCRYPTION_SECRET.")
    }
    return plain
  }
  if (looksLikeLegacyCiphertext(stored)) {
    const plain = decryptString(stored)
    if (plain) return plain
  }
  return stored
}

/** True when the stored value should be rewritten with the current seal. */
export function tokenNeedsReseal(stored: string | null | undefined): boolean {
  if (!stored || isPlaceholderToken(stored) || isSealedAccessToken(stored)) return false
  return true
}
