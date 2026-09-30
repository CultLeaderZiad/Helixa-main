import { normalizeRegion } from "@/lib/tiktok/region"

export interface TikTokAccountSettings {
  region: string | null
  welcome: string
  defaultReply: string
  suggestedQuestions: string[]
}

function record(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function readTikTokSettings(metadata: unknown): TikTokAccountSettings {
  const meta = record(metadata) || {}
  const dm = record(meta.tiktok_dm) || record(meta.dm) || {}
  const questions = Array.isArray(dm.suggested_questions)
    ? dm.suggested_questions.map((item) => text(item)).filter(Boolean).slice(0, 3)
    : []
  return {
    region: normalizeRegion(meta.region || meta.country || meta.country_code),
    welcome: text(dm.welcome).slice(0, 1000),
    defaultReply: text(dm.default_reply).slice(0, 1000),
    suggestedQuestions: questions,
  }
}

export function mergeTikTokSettings(
  metadata: unknown,
  patch: {
    region?: string | null
    welcome?: string | null
    defaultReply?: string | null
    suggestedQuestions?: string[] | null
  },
): Record<string, unknown> {
  const meta = { ...(record(metadata) || {}) }
  const current = readTikTokSettings(meta)
  if (patch.region !== undefined) {
    const region = normalizeRegion(patch.region)
    if (region) meta.region = region
    else delete meta.region
  }
  const dm = record(meta.tiktok_dm) || {}
  const welcome = patch.welcome !== undefined ? text(patch.welcome).slice(0, 1000) : current.welcome
  const defaultReply = patch.defaultReply !== undefined ? text(patch.defaultReply).slice(0, 1000) : current.defaultReply
  const suggested = patch.suggestedQuestions !== undefined
    ? (patch.suggestedQuestions || []).map((item) => text(item)).filter(Boolean).slice(0, 3)
    : current.suggestedQuestions
  meta.tiktok_dm = {
    ...dm,
    welcome,
    default_reply: defaultReply,
    suggested_questions: suggested,
  }
  return meta
}
