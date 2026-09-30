const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const PHONE = /(?:\+|00)?(?:20|966|971|965|974|973|968|962|961|970)?[\s-]?\d(?:[\s-]?\d){7,13}/

export function extractLeadFields(text: string, hinted: Record<string, string> = {}): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(hinted)) {
    const name = key.trim().toLowerCase().slice(0, 40)
    const clean = String(value || "").trim().slice(0, 200)
    if (name && clean) fields[name] = clean
  }
  const email = text.match(EMAIL)?.[0]
  if (email && !fields.email) fields.email = email.toLowerCase()
  const phone = text.match(PHONE)?.[0]?.replace(/[\s-]/g, "")
  if (phone && phone.replace(/\D/g, "").length >= 8 && !fields.phone) fields.phone = phone
  const name = text.match(/(?:اسمي|انا|أنا|my name is|i am)\s+([^\n,.]{2,40})/i)?.[1]?.trim()
  if (name && !fields.name) fields.name = name
  return fields
}
