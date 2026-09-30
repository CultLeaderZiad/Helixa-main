export function chunkText(text: string, maxChars = 500, overlap = 80): string[] {
  const clean = String(text || "").replace(/\r/g, "").trim()
  if (!clean) return []
  const paragraphs = clean.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ""
  const pushLong = (para: string) => {
    const step = Math.max(1, maxChars - overlap)
    for (let index = 0; index < para.length; index += step) {
      const slice = para.slice(index, index + maxChars).trim()
      if (slice) chunks.push(slice)
    }
  }
  for (const para of paragraphs) {
    if (para.length > maxChars) {
      if (current) {
        chunks.push(current)
        current = ""
      }
      pushLong(para)
      continue
    }
    const next = current ? `${current}\n\n${para}` : para
    if (next.length > maxChars) {
      if (current) chunks.push(current)
      current = para
    } else {
      current = next
    }
  }
  if (current) chunks.push(current)
  return chunks.slice(0, 200)
}

export function sourceToChunks(input: { kind: string; title: string; body: string }): string[] {
  const title = input.title.trim()
  const body = input.body.trim()
  if (input.kind === "faq") {
    const packed = `Q: ${title}\nA: ${body}`
    return chunkText(packed)
  }
  if (input.kind === "product") {
    return chunkText(`Product: ${title}\n${body}`)
  }
  if (input.kind === "policy") {
    return chunkText(`Policy: ${title}\n${body}`)
  }
  const header = title ? `${title}\n\n${body}` : body
  return chunkText(header)
}

/** Pull visible strings out of a simple PDF. Compressed streams are left alone. */
export function extractPdfText(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes)
  const parts: string[] = []
  const literal = /\((?:\\\)|\\.|[^\\)]){2,}\)/g
  for (const match of raw.match(literal) || []) {
    const inner = match.slice(1, -1).replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\")
    if (/[A-Za-z\u0600-\u06FF]/.test(inner)) parts.push(inner)
  }
  return parts.join("\n").trim()
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 20000)
}
