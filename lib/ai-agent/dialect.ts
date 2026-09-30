export const DIALECTS = ["egyptian", "gulf", "levantine", "msa", "english"] as const

export type Dialect = (typeof DIALECTS)[number]

export type GulfVariety = "saudi" | "emirati" | "kuwaiti" | "gulf"

export interface DialectDetection {
  dialect: Dialect
  gulf: GulfVariety | null
  arabizi: boolean
  scores: Record<Dialect, number>
}

const EGYPTIAN = [
  "ازيك", "إزيك", "ازاي", "إزاي", "عامل ايه", "عاملة ايه", "كده", "كدة", "عايز", "عايزة", "مش", "دلوقتي", "النهاردة", "بكرة", "علشان", "عشان", "برضو", "برضه", "يا باشا", "حاجة", "فين", "بتاع", "خلاص", "يا نهار",
]
const SAUDI = ["وش", "ايش", "ابغى", "أبغى", "الحين", "وش لونك", "يا رجال", "مرة"]
const EMIRATI = ["شحالك", "شخبارك", "هالجذي", "شحالكم"]
const KUWAITI = ["شلونك", "شنو", "چذي", "جذي"]
const GULF = ["ياخوي", "يا خوي", "زين", "هلا", "ابي", "أبي", "وايد", "سم", "شلون"]
const LEVANTINE = ["شو", "كيفك", "هلق", "هلأ", "كتير", "منيح", "بدي", "بدّي", "هيك", "ليش", "هلّأ", "وين", "عم ب"]

const EGYPTIAN_LATIN = ["ezayak", "ezzayak", "ezayek", "3ayez", "3ayza", "3amel eh", "keda", "kda", "delwa2ty", "elnaharda", "3ashan", "ya basha", "7aga", "mesh"]
const SAUDI_LATIN = ["abgha", "abghah", "al7een", "wesh", "esh lonak", "ya rejal"]
const EMIRATI_LATIN = ["sh7alak", "sh7alk", "shakhbarak"]
const KUWAITI_LATIN = ["shlonk", "shlonak", "shno", "chithi", "chathi"]
const GULF_LATIN = ["zain", "ya5oy", "ya khoi", "waid", "abghak"]
const LEVANTINE_LATIN = ["kifak", "keefak", "shu", "halla2", "halla'", "kteer", "kteeer", "mni7", "mneeh", "baddi", "bade", "hek", "lesh"]

const ENGLISH = ["the", "what", "price", "hello", "please", "order", "how", "much", "thanks", "can", "you", "this", "want", "where", "help"]

function normalize(text: string): string {
  return text
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ً-ْ]/g, "")
    .toLowerCase()
}

function hits(text: string, phrases: string[]): number {
  let score = 0
  for (const phrase of phrases) {
    const needle = normalize(phrase)
    if (!needle) continue
    if (text.includes(needle)) score += needle.includes(" ") ? 2 : 1
  }
  return score
}

function latinRatio(text: string): number {
  const letters = text.match(/[a-zA-Z\u0600-\u06FF]/g) || []
  if (letters.length === 0) return 0
  const latin = letters.filter((char) => /[a-zA-Z]/.test(char)).length
  return latin / letters.length
}

function arabicRatio(text: string): number {
  const letters = text.match(/[a-zA-Z\u0600-\u06FF]/g) || []
  if (letters.length === 0) return 0
  const arabic = letters.filter((char) => /[\u0600-\u06FF]/.test(char)).length
  return arabic / letters.length
}

/** Latin letters mixed with the digits Arabs use for ع ح خ ق ص غ. */
export function looksLikeArabizi(text: string): boolean {
  if (arabicRatio(text) >= 0.25) return false
  if (latinRatio(text) < 0.4) return false
  if (/[a-zA-Z][2356789]|[2356789][a-zA-Z]/.test(text)) return true
  if (/[37]'[a-zA-Z]/.test(text)) return true
  const folded = normalize(text)
  const lexicon = [...EGYPTIAN_LATIN, ...SAUDI_LATIN, ...EMIRATI_LATIN, ...KUWAITI_LATIN, ...GULF_LATIN, ...LEVANTINE_LATIN]
  return hits(folded, lexicon) > 0
}

function englishScore(text: string): number {
  const tokens = new Set(text.split(/[^a-z]+/).filter((token) => token.length > 1))
  let score = 0
  for (const word of ENGLISH) if (tokens.has(word)) score += 1
  return score
}

export function detectDialect(input: string): DialectDetection {
  const raw = String(input || "")
  const text = normalize(raw)
  const scores: Record<Dialect, number> = { egyptian: 0, gulf: 0, levantine: 0, msa: 0, english: 0 }
  const arabizi = looksLikeArabizi(raw)
  let saudi = 0
  let emirati = 0
  let kuwaiti = 0
  let gulfGeneric = 0

  if (arabicRatio(raw) >= 0.25) {
    scores.egyptian = hits(text, EGYPTIAN)
    saudi = hits(text, SAUDI)
    emirati = hits(text, EMIRATI)
    kuwaiti = hits(text, KUWAITI)
    gulfGeneric = hits(text, GULF)
    scores.gulf = saudi + emirati + kuwaiti + gulfGeneric
    scores.levantine = hits(text, LEVANTINE)
    const dialectMax = Math.max(scores.egyptian, scores.gulf, scores.levantine)
    if (dialectMax === 0) scores.msa = 1
  } else if (arabizi) {
    scores.egyptian = hits(text, EGYPTIAN_LATIN)
    saudi = hits(text, SAUDI_LATIN)
    emirati = hits(text, EMIRATI_LATIN)
    kuwaiti = hits(text, KUWAITI_LATIN)
    gulfGeneric = hits(text, GULF_LATIN)
    scores.gulf = saudi + emirati + kuwaiti + gulfGeneric
    scores.levantine = hits(text, LEVANTINE_LATIN)
    if (Math.max(scores.egyptian, scores.gulf, scores.levantine) === 0) scores.msa = 1
  } else {
    scores.english = Math.max(1, englishScore(text))
  }

  let dialect: Dialect = "english"
  if (scores.english > 0 && scores.egyptian + scores.gulf + scores.levantine + scores.msa === 0) {
    dialect = "english"
  } else {
    const ranked: Dialect[] = ["egyptian", "gulf", "levantine", "msa"]
    dialect = ranked.reduce((best, item) => (scores[item] > scores[best] ? item : best), "msa" as Dialect)
    if (scores[dialect] === 0) dialect = arabicRatio(raw) >= 0.25 || arabizi ? "msa" : "english"
  }

  let gulf: GulfVariety | null = null
  if (dialect === "gulf") {
    const best = Math.max(saudi, emirati, kuwaiti)
    if (best === 0) gulf = "gulf"
    else if (saudi === best) gulf = "saudi"
    else if (emirati === best) gulf = "emirati"
    else gulf = "kuwaiti"
  }

  return { dialect, gulf, arabizi, scores }
}

const REPLY_NAME: Record<Dialect, string> = {
  egyptian: "Egyptian Arabic",
  gulf: "Gulf Arabic",
  levantine: "Levantine Arabic",
  msa: "Modern Standard Arabic",
  english: "English",
}

const GULF_NAME: Record<GulfVariety, string> = {
  saudi: "Saudi Arabic",
  emirati: "Emirati Arabic",
  kuwaiti: "Kuwaiti Arabic",
  gulf: "Gulf Arabic",
}

/** Tell the model which dialect to answer in. Arabizi is understood, then answered in Arabic script. */
export function replyInstruction(detection: DialectDetection): string {
  const name = detection.dialect === "gulf" && detection.gulf ? GULF_NAME[detection.gulf] : REPLY_NAME[detection.dialect]
  const arabizi = detection.arabizi
    ? " The customer wrote Arabizi. Understand it, and reply in Arabic script in that dialect."
    : ""
  return `Reply in ${name}. Match the customer's dialect. Do not switch dialects.${arabizi}`
}
