/**
 * Central brand contact and identity configuration.
 * All public/business contact details MUST be imported from here.
 * Never hardcode personal email addresses or personal phone numbers in UI or code.
 */

export const brand = {
  legalName: "Helixa",
  operatorLine: "Helixa is operated by Ziad Sabry, Cairo, Egypt",
  supportEmail: "support@helixa.app",
  billingEmail: "billing@helixa.app",
  // TODO [LAUNCH-BLOCKER]: Configure verified business wallet phone number in VODAFONE_CASH_WALLET env
  vodafoneCashNumber: process.env.NEXT_PUBLIC_VODAFONE_CASH_NUMBER || "01099992994",
  whatsappSupport: "https://wa.me/201099992994",
  websiteUrl: "https://helixa.app",
  docsUrl: "https://helixa.app/docs",
} as const

export const BRAND_CONFIG = {
  ...brand,
  name: brand.legalName,
  tagline: "AI solutions for social comments, DMs, and conversations",
  businessWalletPhone: brand.vodafoneCashNumber,
  helpUrl: `mailto:${brand.supportEmail}`,
} as const

export default brand
