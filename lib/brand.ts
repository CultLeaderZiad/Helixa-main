/**
 * Single source of truth for brand, legal, and business contact configuration.
 * All public/business contact details and logo paths MUST be imported from here.
 * Never hardcode personal emails or personal phone numbers in UI or code.
 */

function env(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined
  const val = process.env[key]
  return val && val.trim() ? val.trim() : undefined
}

function requiredEnv(key: string): string {
  if (typeof process !== "undefined" && process.env) {
    const val = process.env[key]
    if (val && val.trim()) return val.trim()
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[BRAND] Missing required environment variable: ${key}`)
    }
  }
  return "http://localhost:3000"
}

export const BRAND = {
  name: "Cyreax DM",
  short: "Cyreax",
  slug: "cyreax-dm",
  tagline: "DM automation for every channel",
  logo: {
    wordmark: "/brand/cyreax-wordmark-transparent.png",
    wordmarkDark: "/brand/cyreax-wordmark-dark.png",
    mark: "/brand/cyreax-mark-transparent.png",
    source: "/brand/cyreax-logo.png",
  },
  appUrl: requiredEnv("NEXT_PUBLIC_APP_URL"),
  emails: {
    support: env("NEXT_PUBLIC_SUPPORT_EMAIL"),
    billing: env("NEXT_PUBLIC_BILLING_EMAIL"),
    noreply: env("EMAIL_FROM_ADDRESS"),
  },
  socials: {
    twitter: env("NEXT_PUBLIC_TWITTER_URL"),
    linkedin: env("NEXT_PUBLIC_LINKEDIN_URL"),
    telegram: env("NEXT_PUBLIC_TELEGRAM_URL"),
    github: env("NEXT_PUBLIC_GITHUB_URL"),
  },
} as const

// Backwards-compatible exports during refactoring
export const brand = {
  legalName: BRAND.name,
  operatorLine: `${BRAND.name} DM Automation`,
  supportEmail: BRAND.emails.support || "support@cyreax.com",
  billingEmail: BRAND.emails.billing || "billing@cyreax.com",
  vodafoneCashNumber: env("NEXT_PUBLIC_VODAFONE_CASH_NUMBER") || "",
  whatsappSupport: env("NEXT_PUBLIC_WHATSAPP_SUPPORT") || "",
  websiteUrl: BRAND.appUrl,
  docsUrl: `${BRAND.appUrl}/docs`,
} as const

export const BRAND_CONFIG = {
  ...brand,
  name: BRAND.name,
  tagline: BRAND.tagline,
  businessWalletPhone: brand.vodafoneCashNumber,
  helpUrl: BRAND.emails.support ? `mailto:${BRAND.emails.support}` : `${BRAND.appUrl}/contact`,
} as const

export default BRAND
