/**
 * Central brand contact and identity configuration.
 * All public/business contact details MUST be imported from here.
 * Never hardcode personal email addresses or phone numbers in UI or code.
 */

export const BRAND_CONFIG = {
  name: "Helixa",
  tagline: "AI solutions for social comments, DMs, and conversations",
  supportEmail: "support@helixa.app",
  billingEmail: "billing@helixa.app",
  // TODO: Add verified business wallet phone number once registered
  businessWalletPhone: "+20 10 0000 0000",
  websiteUrl: "https://helixa.app",
  docsUrl: "https://helixa.app/docs",
  helpUrl: "mailto:support@helixa.app",
} as const
