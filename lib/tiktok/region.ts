import { tiktokMessagingEnabled, tiktokUsReviewApproved } from "@/lib/tiktok/config"

/**
 * Business Messaging region rules from TikTok's access guide
 * (doc 1832184145137922, checked 2026-09-30).
 *
 * Direct messages are available for Business Accounts signed up outside the
 * EEA, Switzerland, and the UK. A US account also needs TikTok's US data
 * security review. Egypt and the GCC are in the rest of the world.
 * The region is the Business Account's TikTok sign-up location. The profile
 * endpoint we call does not document that field, so an unknown region stays
 * on the rest-of-world default and DMs stay available.
 *
 * Comment-to-Message is a separate product (send doc 1832184403754242) and
 * only works for accounts registered in Vietnam, Indonesia, or Thailand.
 * Membership in `COMMENT_TO_MESSAGE_REGIONS` is the switch: adding a code
 * turns the feature on for that sign-up region without a new environment flag.
 */

export const EEA_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
] as const

export const COMMENT_TO_MESSAGE_REGIONS = ["VN", "ID", "TH"] as const

const EEA = new Set<string>(EEA_REGIONS)
const COMMENT_TO_MESSAGE = new Set<string>(COMMENT_TO_MESSAGE_REGIONS)

const NAMES: Record<string, string> = {
  EGYPT: "EG",
  UAE: "AE",
  "UNITED ARAB EMIRATES": "AE",
  KSA: "SA",
  "SAUDI ARABIA": "SA",
  UK: "GB",
  "UNITED KINGDOM": "GB",
  ENGLAND: "GB",
  BRITAIN: "GB",
  SWITZERLAND: "CH",
  VIETNAM: "VN",
  INDONESIA: "ID",
  THAILAND: "TH",
  GERMANY: "DE",
  FRANCE: "FR",
  "UNITED STATES": "US",
  USA: "US",
  QATAR: "QA",
  KUWAIT: "KW",
  BAHRAIN: "BH",
  OMAN: "OM",
  GREECE: "GR",
}

export type DmRegionReason = "allowed" | "unknown" | "eea" | "uk" | "switzerland" | "us"

export function normalizeRegion(value: unknown): string | null {
  if (value == null) return null
  const raw = String(value).trim()
  if (!raw) return null
  const key = raw.toUpperCase().replace(/[._]/g, " ").replace(/\s+/g, " ")
  if (NAMES[key]) return NAMES[key]
  const compact = key.replace(/\s+/g, "")
  if (NAMES[compact]) return NAMES[compact]
  if (!/^[A-Z]{2}$/.test(compact)) return null
  if (compact === "UK") return "GB"
  if (compact === "EL") return "GR"
  return compact
}

export function dmMessagingAllowed(
  region: string | null | undefined,
  options?: { usReviewApproved?: boolean },
): { allowed: boolean; reason: DmRegionReason } {
  const code = normalizeRegion(region)
  if (!code) return { allowed: true, reason: "unknown" }
  if (code === "GB") return { allowed: false, reason: "uk" }
  if (code === "CH") return { allowed: false, reason: "switzerland" }
  if (EEA.has(code)) return { allowed: false, reason: "eea" }
  if (code === "US") {
    const approved = options?.usReviewApproved ?? tiktokUsReviewApproved()
    return approved ? { allowed: true, reason: "allowed" } : { allowed: false, reason: "us" }
  }
  return { allowed: true, reason: "allowed" }
}

/**
 * Comment-to-Message for one Business Account.
 * A stored region wins over the global flag: VN/ID/TH are on, everyone else
 * is off. With no region, the historical `TIKTOK_COMMENT_TO_DM_ENABLED=true`
 * switch still applies so existing tests and untagged accounts keep working.
 * An explicit `false` is a kill switch for every region.
 */
export function commentToMessageAllowed(region: string | null | undefined): boolean {
  if (!tiktokMessagingEnabled()) return false
  if (process.env.TIKTOK_COMMENT_TO_DM_ENABLED === "false") return false
  const code = normalizeRegion(region)
  if (code) return COMMENT_TO_MESSAGE.has(code)
  return process.env.TIKTOK_COMMENT_TO_DM_ENABLED === "true"
}
