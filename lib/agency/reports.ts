export interface ReportKpis {
  conversations: number
  newContacts: number
  orders: number
  revenueCents: number
  aiReplies: number
  handoffs: number
}

export interface ReportSchedule {
  cadence: "weekly" | "monthly"
  enabled: boolean
  nextSendAt: string | null
  lastSentAt: string | null
}

export function nextReportAt(cadence: "weekly" | "monthly", fromMs: number): number {
  const date = new Date(fromMs)
  if (cadence === "weekly") date.setUTCDate(date.getUTCDate() + 7)
  else date.setUTCMonth(date.getUTCMonth() + 1)
  return date.getTime()
}

export function reportIsDue(report: ReportSchedule, nowMs: number): boolean {
  if (!report.enabled || !report.nextSendAt) return false
  const due = Date.parse(report.nextSendAt)
  return Number.isFinite(due) && due <= nowMs
}

export function sumKpis(rows: ReportKpis[]): ReportKpis {
  return rows.reduce(
    (total, row) => ({
      conversations: total.conversations + row.conversations,
      newContacts: total.newContacts + row.newContacts,
      orders: total.orders + row.orders,
      revenueCents: total.revenueCents + row.revenueCents,
      aiReplies: total.aiReplies + row.aiReplies,
      handoffs: total.handoffs + row.handoffs,
    }),
    { conversations: 0, newContacts: 0, orders: 0, revenueCents: 0, aiReplies: 0, handoffs: 0 },
  )
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

/**
 * One-page PDF using the built-in Helvetica font.
 * Helvetica has no Arabic glyphs, so the file uses Latin labels. The share
 * page is the Arabic-capable copy of the same numbers.
 */
export function renderReportPdf(input: {
  appName: string
  clientName: string
  periodLabel: string
  kpis: ReportKpis
}): Uint8Array {
  const lines = [
    pdfEscape(input.appName || "Helixa"),
    pdfEscape(`Client: ${input.clientName}`),
    pdfEscape(input.periodLabel),
    `Conversations: ${input.kpis.conversations}`,
    `New contacts: ${input.kpis.newContacts}`,
    `Orders: ${input.kpis.orders}`,
    `Revenue (cents): ${input.kpis.revenueCents}`,
    `AI replies: ${input.kpis.aiReplies}`,
    `Handoffs: ${input.kpis.handoffs}`,
  ]
  const commands = ["BT", "/F1 16 Tf", "48 740 Td"]
  lines.forEach((line, index) => {
    if (index === 0) commands.push(`(${line}) Tj`)
    else commands.push(`0 -28 Td (${line}) Tj`)
  })
  commands.push("ET")
  const stream = commands.join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]
  let body = "%PDF-1.4\n"
  const offsets: number[] = [0]
  objects.forEach((object, index) => {
    offsets.push(body.length)
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n`
  body += "0000000000 65535 f \n"
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, "0")} 00000 n \n`
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(body)
}

export function shareToken(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")
}
