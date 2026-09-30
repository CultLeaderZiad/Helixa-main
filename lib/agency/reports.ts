import { readFileSync } from "fs"
import path from "path"
import fontkit from "@pdf-lib/fontkit"
import { PDFDocument, rgb } from "pdf-lib"
import { lineIsRtl, shapeForPdf } from "@/lib/pdf/arabic"

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

let arabicFont: Uint8Array | null = null

function loadArabicFont(): Uint8Array {
  if (!arabicFont) {
    arabicFont = readFileSync(path.join(process.cwd(), "lib/pdf/fonts/NotoNaskhArabic-Regular.ttf"))
  }
  return arabicFont
}

function reportLines(input: { appName: string; clientName: string; periodLabel: string; kpis: ReportKpis }, arabic: boolean): string[] {
  if (arabic) {
    return [
      input.appName || "Helixa",
      `العميل: ${input.clientName}`,
      input.periodLabel,
      `المحادثات: ${input.kpis.conversations}`,
      `جهات اتصال جديدة: ${input.kpis.newContacts}`,
      `الطلبات: ${input.kpis.orders}`,
      `الإيراد (أصغر وحدة): ${input.kpis.revenueCents}`,
      `ردود الذكاء الاصطناعي: ${input.kpis.aiReplies}`,
      `التحويل للفريق: ${input.kpis.handoffs}`,
    ]
  }
  return [
    input.appName || "Helixa",
    `Client: ${input.clientName}`,
    input.periodLabel,
    `Conversations: ${input.kpis.conversations}`,
    `New contacts: ${input.kpis.newContacts}`,
    `Orders: ${input.kpis.orders}`,
    `Revenue (cents): ${input.kpis.revenueCents}`,
    `AI replies: ${input.kpis.aiReplies}`,
    `Handoffs: ${input.kpis.handoffs}`,
  ]
}

/**
 * One-page PDF with Noto Naskh Arabic embedded.
 * Arabic runs are shaped to presentation forms and drawn in visual order.
 */
export async function renderReportPdf(input: {
  appName: string
  clientName: string
  periodLabel: string
  kpis: ReportKpis
}): Promise<Uint8Array> {
  const arabic = /[\u0600-\u06FF]/.test(`${input.appName} ${input.clientName} ${input.periodLabel}`)
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle(`${input.appName || "Helixa"} report`)
  const font = await pdf.embedFont(loadArabicFont(), { subset: true })
  const page = pdf.addPage([612, 792])
  const lines = reportLines(input, arabic)
  let y = 740
  for (const line of lines) {
    const visual = shapeForPdf(line)
    const size = y === 740 ? 18 : 13
    const width = font.widthOfTextAtSize(visual, size)
    const x = lineIsRtl(line) ? Math.max(48, 564 - width) : 48
    page.drawText(visual, { x, y, size, font, color: rgb(0.1, 0.1, 0.12) })
    y -= 28
  }
  return pdf.save()
}

export function shareToken(): string {
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("")
}
