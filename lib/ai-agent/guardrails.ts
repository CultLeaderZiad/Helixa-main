import type { Dialect, DialectDetection } from "@/lib/ai-agent/dialect"
import type { RetrievedChunk } from "@/lib/ai-agent/retrieve"

export interface AgentSettings {
  enabled: boolean
  personaName: string
  persona: string
  tone: "friendly" | "professional" | "concise"
  handoffBelow: number
  stayOnTopic: boolean
  minSimilarity: number
  qualifyFields: string[]
}

export const DEFAULT_AGENT_SETTINGS: AgentSettings = {
  enabled: true,
  personaName: "Helixa",
  persona: "You help customers of this business.",
  tone: "friendly",
  handoffBelow: 0.45,
  stayOnTopic: true,
  minSimilarity: 0.12,
  qualifyFields: ["name", "phone", "email"],
}

const PRICE_QUESTION = /سعر|بكام|بكم|كم سعر|ب كام|how much|price|cost|تكلفه|تكلفة/i
const HUMAN_REQUEST = /موظف|حد من الفريق|بشري|انسان|إنسان|حولني|حولوني|ابغى احد|أبغى أحد|عايز اكلم|اريد التحدث|talk to (a )?(human|person|agent|someone)|real person|customer service/i
const SMALL_TALK = /^(hi|hello|hey|thanks|thank you|سلام|السلام عليكم|مرحبا|هلا|اهلا|أهلًا|شكرا|شكراً|ازيك|كيفك|شلونك)[!.\s]*$/i

const SAFE_PRICE: Record<Dialect, string> = {
  egyptian: "السعر ده مش موجود في البيانات اللي عندي، فمش هقدر أقوله. هحوّلك لحد من الفريق.",
  gulf: "هذا السعر مو موجود في البيانات اللي عندنا، فما أقدر أقوله. بحولك لأحد من الفريق.",
  levantine: "هالسعر مو موجود بالمعلومات يلي عنا، فما فيني أقوله. رح حولك لحدا من الفريق.",
  msa: "هذا السعر غير موجود في المعلومات المتاحة، ولن أذكر سعراً غير مؤكد. سأحولك إلى أحد الموظفين.",
  english: "I don't have that price on file, so I won't guess. I'll hand you to a teammate.",
}

const OFF_TOPIC: Record<Dialect, string> = {
  egyptian: "أقدر أساعدك في أسئلة عن منتجاتنا وخدماتنا وسياساتنا بس.",
  gulf: "أقدر أساعدك في أسئلة منتجاتنا وخدماتنا وسياساتنا.",
  levantine: "فيني ساعدك بأسئلة عن منتجاتنا وخدماتنا وسياساتنا.",
  msa: "يمكنني المساعدة في الأسئلة المتعلقة بمنتجاتنا وخدماتنا وسياساتنا.",
  english: "I can help with questions about our products, services, and policies.",
}

const HANDOFF_LINE: Record<Dialect, string> = {
  egyptian: "هحوّلك لحد من الفريق يكمل معاك.",
  gulf: "بحولك لأحد من الفريق يكمل معك.",
  levantine: "رح حولك لحدا من الفريق ليكمل معك.",
  msa: "سأحولك إلى أحد موظفي الفريق.",
  english: "I'll hand this chat to a teammate.",
}

function arabicDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
}

/** Currency-adjacent amounts only, so "3 colors" is not a price. */
export function extractPrices(text: string): string[] {
  const source = arabicDigits(text)
  const pattern = /(\d{1,7}(?:[.,]\d{1,2})?)\s*(egp|usd|sar|aed|kwd|qar|bhd|omr|jod|جنيه|جنيها|ريال|درهم|دينار|دولار)|(?:egp|usd|sar|aed|kwd|qar|\$|£)\s*(\d{1,7}(?:[.,]\d{1,2})?)/gi
  const found = new Set<string>()
  for (const match of source.matchAll(pattern)) {
    const raw = match[1] || match[3]
    if (!raw) continue
    found.add(normalizeAmount(raw))
  }
  return [...found]
}

function normalizeAmount(raw: string): string {
  const value = Number(raw.replace(",", "."))
  if (!Number.isFinite(value)) return raw
  return Number.isInteger(value) ? String(value) : String(value)
}

function foldArabic(text: string): string {
  return text.replace(/[أإآ]/g, "ا")
}

export function asksForPrice(text: string): boolean {
  return PRICE_QUESTION.test(foldArabic(text))
}

export function asksForHuman(text: string): boolean {
  return HUMAN_REQUEST.test(foldArabic(text))
}

export function isSmallTalk(text: string): boolean {
  return SMALL_TALK.test(text.trim())
}

export function inventedPrices(reply: string, sources: string[]): string[] {
  const allowed = new Set(sources.flatMap((source) => extractPrices(source)))
  return extractPrices(reply).filter((price) => !allowed.has(price))
}

export interface GuardInput {
  message: string
  reply: string
  confidence: number
  detection: DialectDetection
  retrieved: RetrievedChunk[]
  settings: AgentSettings
  modelHandoff?: boolean
}

export interface GuardDecision {
  reply: string
  confidence: number
  handoff: boolean
  handoffReason: string | null
  offTopic: boolean
  blockedPrices: string[]
}

export function applyGuardrails(input: GuardInput): GuardDecision {
  const dialect = input.detection.dialect
  const top = input.retrieved[0]?.similarity ?? 0
  const sourceText = input.retrieved.map((chunk) => chunk.content)
  let reply = input.reply.trim()
  let confidence = clamp(input.confidence)
  let handoff = input.modelHandoff === true
  let reason: string | null = handoff ? "model" : null
  let offTopic = false
  const blocked = inventedPrices(reply, sourceText)

  if (asksForHuman(input.message)) {
    handoff = true
    reason = "human_requested"
    reply = HANDOFF_LINE[dialect]
  } else if (blocked.length > 0 || (asksForPrice(input.message) && extractPrices(sourceText.join("\n")).length === 0 && extractPrices(reply).length > 0)) {
    handoff = true
    reason = "invented_price"
    confidence = Math.min(confidence, input.settings.handoffBelow - 0.01)
    reply = SAFE_PRICE[dialect]
  } else if (
    input.settings.stayOnTopic &&
    !isSmallTalk(input.message) &&
    (input.retrieved.length === 0 || top < input.settings.minSimilarity)
  ) {
    offTopic = true
    reply = OFF_TOPIC[dialect]
    confidence = Math.max(confidence, input.settings.handoffBelow)
  }

  if (!handoff && confidence < input.settings.handoffBelow) {
    handoff = true
    reason = "low_confidence"
    reply = `${reply}\n\n${HANDOFF_LINE[dialect]}`.trim()
  }

  if (handoff && reason === "model" && !reply) reply = HANDOFF_LINE[dialect]

  return {
    reply,
    confidence,
    handoff,
    handoffReason: reason,
    offTopic,
    blockedPrices: blocked,
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export function handoffLine(dialect: Dialect): string {
  return HANDOFF_LINE[dialect]
}
