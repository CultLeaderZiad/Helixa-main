/** Keyword and intent phrases for TikTok DMs. Arabic aliases cover the MENA inbox. */

export const TIKTOK_INTENTS: Record<string, string[]> = {
  price: ["price", "pricing", "how much", "كم", "سعر", "بكام", "السعر"],
  link: ["link", "رابط", "اللينك", "الرابط"],
  hello: ["hi", "hello", "hey", "مرحبا", "السلام", "اهلا", "أهلا"],
}

export function isKnownTikTokIntent(value: string): boolean {
  const key = value.trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(TIKTOK_INTENTS, key)
}

export function matchTikTokIntent(intent: string, text: string): boolean {
  const key = intent.trim().toLowerCase()
  const phrases = TIKTOK_INTENTS[key]
  const haystack = (text || "").toLowerCase()
  if (!phrases) return haystack.includes(key) && key.length > 0
  return phrases.some((phrase) => haystack.includes(phrase.toLowerCase()))
}
