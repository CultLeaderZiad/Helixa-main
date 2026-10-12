/**
 * Utility functions for formatting human-readable contact names and identifiers.
 * Guarantees that internal database IDs (cnt_..., UUIDs) are never exposed in user-facing UI.
 */

export interface ContactLike {
  id?: string
  display_name?: string | null
  name?: string | null
  recipient_username?: string | null
  username?: string | null
  external_id?: string | null
  recipient_id?: string | number | null
  channel?: string | null
  platform?: string | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RAW_PREFIX_REGEX = /^(cnt_|usr_|acc_|act::)/i

/**
 * Returns a human-readable contact display name.
 * Priority: real name -> @username -> "{Channel} user · {last 5 digits}".
 */
export function displayName(contact?: ContactLike | string | null, lang: "en" | "ar" = "en"): string {
  if (!contact) {
    return lang === "ar" ? "عميل" : "Customer"
  }

  // Handle plain string input
  if (typeof contact === "string") {
    const trimmed = contact.trim()
    if (!trimmed) return lang === "ar" ? "عميل" : "Customer"
    if (!UUID_REGEX.test(trimmed) && !RAW_PREFIX_REGEX.test(trimmed)) {
      return trimmed
    }
    const cleanDigits = trimmed.replace(/\D/g, "")
    const alphanumeric = trimmed.replace(/[^a-zA-Z0-9]/g, "")
    const last5 = (cleanDigits.length >= 5 ? cleanDigits.slice(-5) : alphanumeric.slice(-5)) || "00000"
    return lang === "ar" ? `مستخدم · ${last5}` : `User · ${last5}`
  }

  // 1. Explicit display name
  const name = (contact.display_name || contact.name)?.trim()
  if (name && !UUID_REGEX.test(name) && !RAW_PREFIX_REGEX.test(name)) {
    return name
  }

  // 2. Social username
  const username = (contact.recipient_username || contact.username)?.trim()
  if (username && !UUID_REGEX.test(username) && !RAW_PREFIX_REGEX.test(username)) {
    return username.startsWith("@") ? username : username
  }

  // 3. Fallback to channel user + last 5 digits
  const rawId = String(
    contact.external_id ||
    contact.recipient_id ||
    contact.recipient_username ||
    contact.display_name ||
    contact.name ||
    contact.id ||
    ""
  ).trim()

  const cleanDigits = rawId.replace(/\D/g, "")
  const alphanumeric = rawId.replace(/[^a-zA-Z0-9]/g, "")
  const isUuid = UUID_REGEX.test(rawId)
  const last5 = (isUuid ? alphanumeric.slice(-5) : cleanDigits.slice(-5) || alphanumeric.slice(-5)) || "00000"

  const channelRaw = (contact.channel || contact.platform || "instagram").toLowerCase()
  const channelFormatted =
    channelRaw === "whatsapp"
      ? "WhatsApp"
      : channelRaw === "facebook" || channelRaw === "messenger"
      ? "Messenger"
      : channelRaw === "tiktok"
      ? "TikTok"
      : channelRaw === "telegram"
      ? "Telegram"
      : "Instagram"

  if (lang === "ar") {
    return `مستخدم ${channelFormatted} · ${last5}`
  }
  return `${channelFormatted} user · ${last5}`
}
