import type { OutboundButton, OutboundContent } from "@/lib/channels/types"

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi

export function extractHttpUrls(text: string): string[] {
  if (!text) return []
  const found = text.match(URL_PATTERN) || []
  const unique: string[] = []
  for (const url of found) {
    const clean = url.replace(/[.,]+$/, "")
    if (!isPublicHttpUrl(clean)) continue
    if (!unique.includes(clean)) unique.push(clean)
  }
  return unique
}

export function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return false
    if (!url.hostname || url.username || url.password) return false
    return true
  } catch {
    return false
  }
}

export function shouldTrackUrl(url: string, appOrigin?: string | null): boolean {
  if (!isPublicHttpUrl(url)) return false
  if (!appOrigin) return true
  try {
    const target = new URL(url)
    const app = new URL(appOrigin)
    if (target.origin === app.origin && target.pathname.startsWith("/r/")) return false
  } catch {
    return false
  }
  return true
}

export function applyUrlMap(text: string, map: Map<string, string>): string {
  if (!text || map.size === 0) return text
  return text.replace(URL_PATTERN, (raw) => {
    const trimmed = raw.replace(/[.,]+$/, "")
    const suffix = raw.slice(trimmed.length)
    return (map.get(trimmed) || trimmed) + suffix
  })
}

function mapButton(button: OutboundButton, map: Map<string, string>): OutboundButton {
  if (button.type === "web_url" && button.url && map.has(button.url)) {
    return { ...button, url: map.get(button.url) }
  }
  return button
}

export function contentWithTrackedUrls(content: OutboundContent, map: Map<string, string>): OutboundContent {
  if (map.size === 0) return content
  const next: OutboundContent = { ...content }
  if (next.message) next.message = applyUrlMap(next.message, map)
  if (next.reply_text) next.reply_text = applyUrlMap(next.reply_text, map)
  if (next.card) {
    next.card = {
      ...next.card,
      subtitle: next.card.subtitle ? applyUrlMap(next.card.subtitle, map) : next.card.subtitle,
      buttons: (next.card.buttons || []).map((button) => mapButton(button, map)),
    }
  }
  return next
}

export function urlsInContent(content: OutboundContent): string[] {
  const urls = [
    ...extractHttpUrls(content.message || ""),
    ...extractHttpUrls(content.reply_text || ""),
    ...extractHttpUrls(content.card?.subtitle || ""),
  ]
  for (const button of content.card?.buttons || []) {
    if (button.type === "web_url" && button.url) urls.push(button.url)
  }
  return [...new Set(urls)]
}

export function trackingCode(): string {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  return Buffer.from(bytes).toString("base64url")
}
