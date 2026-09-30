import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const MIN_SECRET_LENGTH = 16

/**
 * Encryption key for tokens and BYOK secrets stored at rest.
 * There is no fallback: a missing or short secret throws so ciphertext
 * is never produced with a guessable key.
 */
function getSecret(): string {
  const secret = process.env.BYOK_ENCRYPTION_SECRET
  if (!secret || secret.trim().length < MIN_SECRET_LENGTH) {
    throw new Error(
      "BYOK_ENCRYPTION_SECRET is required (at least 16 characters). Refusing to encrypt or decrypt without it.",
    )
  }
  return secret
}

export function encryptString(text: string): string {
  const secret = crypto.createHash("sha256").update(getSecret()).digest()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, secret, iv)

  let encrypted = cipher.update(text, "utf8", "base64")
  encrypted += cipher.final("base64")

  const authTag = cipher.getAuthTag().toString("base64")

  return `${iv.toString("base64")}:${authTag}:${encrypted}`
}

export function decryptString(encryptedText: string): string | null {
  const secret = crypto.createHash("sha256").update(getSecret()).digest()
  try {
    const [iv64, authTag64, encrypted] = encryptedText.split(":")

    if (!iv64 || !authTag64 || !encrypted) return null

    const iv = Buffer.from(iv64, "base64")
    const authTag = Buffer.from(authTag64, "base64")

    const decipher = crypto.createDecipheriv(ALGORITHM, secret, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, "base64", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (e) {
    console.error("[crypto] Decrypt failed:", e)
    return null
  }
}
