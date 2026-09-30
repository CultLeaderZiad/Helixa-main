/**
 * Sellable plan catalog for creators and agencies.
 * This file is the limit source of truth. The `plans` table is still the
 * public pricing display; enforcement reads these numbers.
 *
 * A limit of -1 means unlimited. Monthly meters are AI replies and broadcasts.
 * Workspaces, channels, contacts, and seats are current counts.
 */

export type PlanAudience = "creator" | "agency"
export type MeterKey = "workspaces" | "channels" | "contacts" | "aiReplies" | "broadcasts" | "seats"
export type FeatureKey = "whiteLabel" | "apiAccess"

export interface PlanLimits {
  workspaces: number
  channels: number
  contacts: number
  aiReplies: number
  broadcasts: number
  seats: number
  whiteLabel: boolean
  apiAccess: boolean
}

export interface PlanDefinition {
  id: string
  name: string
  audience: PlanAudience
  description: string
  monthlyUsd: number
  yearlyUsd: number
  trialDays: number
  limits: PlanLimits
  /** Account.plan values that resolve to this tier, including legacy slugs. */
  aliases: string[]
}

export const SOFT_LIMIT_RATIO = 0.8
export const TRIAL_DAYS = 14
export const DUNNING_GRACE_DAYS = 7

export const PLAN_CATALOG: PlanDefinition[] = [
  {
    id: "creator_free",
    name: "Creator Free",
    audience: "creator",
    description: "One channel and a small contact list, so a creator can try Helixa.",
    monthlyUsd: 0,
    yearlyUsd: 0,
    trialDays: 0,
    limits: {
      workspaces: 1,
      channels: 1,
      contacts: 500,
      aiReplies: 100,
      broadcasts: 0,
      seats: 1,
      whiteLabel: false,
      apiAccess: false,
    },
    aliases: ["creator_free", "free"],
  },
  {
    id: "creator",
    name: "Creator",
    audience: "creator",
    description: "Instagram, WhatsApp, and one more channel, with monthly broadcasts.",
    monthlyUsd: 29,
    yearlyUsd: 290,
    trialDays: TRIAL_DAYS,
    limits: {
      workspaces: 1,
      channels: 3,
      contacts: 5000,
      aiReplies: 2000,
      broadcasts: 4,
      seats: 2,
      whiteLabel: false,
      apiAccess: true,
    },
    aliases: ["creator", "monthly", "trial"],
  },
  {
    id: "creator_plus",
    name: "Creator Plus",
    audience: "creator",
    description: "More channels, a public API, and room for a small team.",
    monthlyUsd: 59,
    yearlyUsd: 590,
    trialDays: TRIAL_DAYS,
    limits: {
      workspaces: 3,
      channels: 8,
      contacts: 25000,
      aiReplies: 10000,
      broadcasts: 20,
      seats: 5,
      whiteLabel: false,
      apiAccess: true,
    },
    aliases: ["creator_plus", "one_time"],
  },
  {
    id: "agency",
    name: "Agency",
    audience: "agency",
    description: "Client workspaces, white-label, and reseller billing.",
    monthlyUsd: 149,
    yearlyUsd: 1490,
    trialDays: TRIAL_DAYS,
    limits: {
      workspaces: 10,
      channels: 30,
      contacts: 100000,
      aiReplies: 40000,
      broadcasts: 50,
      seats: 10,
      whiteLabel: true,
      apiAccess: true,
    },
    aliases: ["agency"],
  },
  {
    id: "agency_pro",
    name: "Agency Pro",
    audience: "agency",
    description: "High-volume agencies. Channels and contacts are not capped.",
    monthlyUsd: 349,
    yearlyUsd: 3490,
    trialDays: TRIAL_DAYS,
    limits: {
      workspaces: 50,
      channels: -1,
      contacts: -1,
      aiReplies: 200000,
      broadcasts: 200,
      seats: 30,
      whiteLabel: true,
      apiAccess: true,
    },
    aliases: ["agency_pro"],
  },
]

const BY_ID = new Map(PLAN_CATALOG.map((plan) => [plan.id, plan]))
const BY_ALIAS = new Map<string, PlanDefinition>()
for (const plan of PLAN_CATALOG) {
  for (const alias of plan.aliases) BY_ALIAS.set(alias, plan)
}

export interface ResolvedPlan extends PlanDefinition {
  /** Expired subscriptions cannot create new usage. The free tier can. */
  blocked: boolean
}

export function resolvePlan(slug: string | null | undefined): ResolvedPlan {
  if (!slug || slug === "expired") {
    const free = BY_ID.get("creator_free")!
    return { ...free, id: slug === "expired" ? "expired" : free.id, blocked: slug === "expired" }
  }
  const match = BY_ALIAS.get(slug) || BY_ID.get(slug) || BY_ID.get("creator_free")!
  return { ...match, blocked: false }
}

export function limitFor(plan: ResolvedPlan, key: MeterKey): number {
  return plan.limits[key]
}

export function featureEnabled(plan: ResolvedPlan, key: FeatureKey): boolean {
  if (plan.blocked) return false
  return plan.limits[key]
}

export function planPriceCents(planId: string, interval: "month" | "year"): number {
  const plan = resolvePlan(planId)
  const usd = interval === "year" ? plan.yearlyUsd : plan.monthlyUsd
  return Math.round(usd * 100)
}

export function isMonthlyMeter(key: MeterKey): boolean {
  return key === "aiReplies" || key === "broadcasts"
}

export function meterPeriod(key: MeterKey, now: Date): string {
  if (!isMonthlyMeter(key)) return "lifetime"
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
}
