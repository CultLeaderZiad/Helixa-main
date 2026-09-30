import { automationToFlow, type MigratedFlow } from "@/lib/flows/migrate"
import type { FlowGraph, FlowNode } from "@/lib/flows/types"

export interface CommentTemplate {
  id: string
  name: string
  keyword: string
  publicReplies: string[]
  dm: string
  buttons: Array<{ title: string; payload: string }>
}

export const COMMENT_TO_DM_TEMPLATES: CommentTemplate[] = [
  {
    id: "price",
    name: "PRICE on Reel",
    keyword: "PRICE",
    publicReplies: ["Sent you the price in DMs", "Check your inbox for the price", "Price is on the way"],
    dm: "Here is the price you asked about. Reply YES if you want the bundle.",
    buttons: [
      { title: "Yes", payload: "YES" },
      { title: "Details", payload: "DETAILS" },
    ],
  },
  {
    id: "link",
    name: "LINK on Reel",
    keyword: "LINK",
    publicReplies: ["Link is in your DMs", "Sent you the link", "Check your inbox"],
    dm: "Here is the link. It is also saved on your contact if you share your email.",
    buttons: [{ title: "Got it", payload: "GOT_IT" }],
  },
  {
    id: "guide",
    name: "GUIDE on Reel",
    keyword: "GUIDE",
    publicReplies: ["Guide sent", "Check your DMs for the guide", "On its way"],
    dm: "Here is the guide. Tell me your city if you want the local routine.",
    buttons: [],
  },
]

export function commentTemplate(id: string): CommentTemplate | null {
  return COMMENT_TO_DM_TEMPLATES.find((item) => item.id === id) || null
}

/**
 * One click for a Reel: a comment keyword flow on that media id.
 * Buttons wait, so the next step can branch, and the public reply still goes out.
 */
export function commentToDmFlow(input: {
  templateId: string
  mediaId?: string | null
  keyword?: string | null
  channel?: string | null
}): MigratedFlow | null {
  const template = commentTemplate(input.templateId)
  if (!template) return null
  const keyword = (input.keyword || template.keyword).trim()
  if (!keyword) return null
  const built = automationToFlow({
    id: `template_${template.id}`,
    name: template.name,
    platform: input.channel || "instagram",
    trigger_source: "comment",
    trigger_type: "keyword",
    trigger_value: keyword,
    specific_media_id: input.mediaId || null,
    response_content: {
      message: template.dm,
      public_replies: template.publicReplies,
      reply_mode: "both",
      quick_replies: template.buttons,
    },
  })
  const send = built.graph.nodes.find((item) => item.id === "send")
  if (send && template.buttons.length) {
    send.data.waitFor = "button"
    send.data.quickReplies = template.buttons
  }
  built.name = input.mediaId ? `${template.name}` : template.name
  return built
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return slug || "page"
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeLead(input: {
  email?: string | null
  phone?: string | null
  name?: string | null
}): { ok: true; email: string | null; phone: string | null; name: string | null } | { ok: false; error: string } {
  const email = (input.email || "").trim().toLowerCase()
  const phone = (input.phone || "").replace(/[^\d+]/g, "")
  const name = (input.name || "").trim().slice(0, 120)
  const emailOk = email ? EMAIL.test(email) : false
  const phoneOk = phone ? phone.replace(/\D/g, "").length >= 8 : false
  if (email && !emailOk) return { ok: false, error: "Enter a valid email" }
  if (phone && !phoneOk) return { ok: false, error: "Enter a valid phone number" }
  if (!emailOk && !phoneOk) return { ok: false, error: "Email or phone is required" }
  return { ok: true, email: emailOk ? email : null, phone: phoneOk ? phone : null, name: name || null }
}

const REF_CODE = /^[A-Za-z0-9_-]{2,64}$/

export function buildRefLink(input: {
  channel: "instagram" | "messenger" | "whatsapp" | "telegram" | "tiktok"
  handle: string
  code: string
  message?: string | null
}): { ok: true; url: string; code: string; triggerText: string } | { ok: false; error: string } {
  const code = input.code.trim()
  if (!REF_CODE.test(code)) return { ok: false, error: "Code must be 2–64 letters, numbers, _ or -" }
  if (input.channel === "instagram") {
    const handle = input.handle.trim().replace(/^@/, "")
    if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return { ok: false, error: "Instagram username is invalid" }
    return { ok: true, url: `https://ig.me/m/${handle}?ref=${encodeURIComponent(code)}`, code, triggerText: code }
  }
  if (input.channel === "messenger") {
    const handle = input.handle.trim().replace(/^@/, "")
    if (!/^[A-Za-z0-9._]{1,64}$/.test(handle)) return { ok: false, error: "Messenger username is invalid" }
    return { ok: true, url: `https://m.me/${handle}?ref=${encodeURIComponent(code)}`, code, triggerText: code }
  }
  if (input.channel === "tiktok") {
    const handle = input.handle.trim().replace(/^@/, "")
    if (!/^[A-Za-z0-9._]{2,24}$/.test(handle)) return { ok: false, error: "TikTok username is invalid" }
    const params = new URLSearchParams()
    params.set("ref", code)
    const message = (input.message || "").trim()
    if (message) params.set("message", message.slice(0, 500))
    return { ok: true, url: `https://tiktok.me/${handle}?${params.toString()}`, code, triggerText: code }
  }
  if (input.channel === "whatsapp") {
    const phone = input.handle.replace(/\D/g, "")
    if (phone.length < 8 || phone.length > 15) return { ok: false, error: "WhatsApp number is invalid" }
    return { ok: true, url: `https://wa.me/${phone}?text=${encodeURIComponent(code)}`, code, triggerText: code }
  }
  const bot = input.handle.trim().replace(/^@/, "")
  if (!/^[A-Za-z0-9_]{5,32}$/.test(bot)) return { ok: false, error: "Telegram bot username is invalid" }
  return { ok: true, url: `https://t.me/${bot}?start=${encodeURIComponent(code)}`, code, triggerText: `/start ${code}` }
}

export interface GiveawayEntry {
  contactId: string
  at: number
}

export function addGiveawayEntry(entries: GiveawayEntry[], contactId: string, at: number): { entries: GiveawayEntry[]; added: boolean } {
  if (!contactId) return { entries, added: false }
  if (entries.some((entry) => entry.contactId === contactId)) return { entries, added: false }
  return { entries: [...entries, { contactId, at }], added: true }
}

function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Same seed and same entrants always pick the same winners. */
export function pickWinners(contactIds: string[], count: number, seed: string): string[] {
  const unique = [...new Set(contactIds)]
  const random = mulberry32(hashSeed(seed))
  const pool = [...unique]
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const swap = pool[i]
    pool[i] = pool[j]
    pool[j] = swap
  }
  const take = Math.max(0, Math.min(pool.length, Math.floor(count)))
  return pool.slice(0, take)
}

export function giveawayKeywordMatches(keyword: string, text: string): boolean {
  const needle = keyword.trim().toLowerCase()
  if (!needle) return false
  return text.trim().toLowerCase() === needle || text.toLowerCase().includes(needle)
}

export type { FlowGraph, FlowNode }
