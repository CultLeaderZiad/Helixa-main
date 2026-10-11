import type * as React from "react"

export interface ActivityEvent {
  id: string
  type: "ai_lead" | "order" | "takeover" | "broadcast" | "token_warning" | "message" | "story_reply"
  actor?: string
  recipient?: string
  content?: string
  secondaryContent?: string
  channel: "instagram" | "whatsapp" | "messenger" | "tiktok" | "telegram" | "webchat"
  amount?: string
  orderId?: string
  provider?: string
  flowName?: string
  reason?: string
  stats?: { opened?: string; clicked?: string }
  createdAt: string
  unread?: boolean
}

/**
 * Format activity events into human-readable strings with bold actors and localized copy.
 */
export function formatEventLabel(event: ActivityEvent, lang: "en" | "ar" = "en"): {
  title: string
  actorHighlight?: string
  subtitle?: string
  isRtlSubtitle?: boolean
} {
  const isAr = lang === "ar"

  switch (event.type) {
    case "ai_lead":
      return {
        title: isAr
          ? `قام وكيل الذكاء الاصطناعي بتأهيل عميل من `
          : `AI Agent qualified a lead from `,
        actorHighlight: `@${event.recipient || "customer"}`,
        subtitle: event.content || (isAr ? "عايزة أعرف السيروم ينفع للبشرة الحساسة؟" : "Customer asked about product details"),
        isRtlSubtitle: true,
      }

    case "order":
      return {
        title: isAr
          ? `طلب #${event.orderId || "1042"} مدفوع · ${event.amount || "1,350 ج.م"} عبر رابط ${event.provider || "Paymob"} في محادثة واتساب`
          : `Order #${event.orderId || "1042"} paid · ${event.amount || "EGP 1,350"} via ${event.provider || "Paymob"} link in WhatsApp thread`,
        subtitle: isAr
          ? `منسوب لمسار "${event.flowName || "Glow kit — تعليق ريلز"}"`
          : `Attributed to flow "${event.flowName || "Glow kit — Reel comment"}"`,
      }

    case "takeover":
      return {
        title: isAr
          ? `استلمت ${event.actor || "لينا م."} محادثة من الذكاء الاصطناعي`
          : `${event.actor || "Lina M."} took over a conversation from AI`,
        subtitle: isAr
          ? `السبب: ${event.reason || "طلب العميل استرداد المبلغ"}`
          : `Reason: ${event.reason || "customer asked for a refund"}`,
      }

    case "broadcast":
      return {
        title: isAr
          ? `تم إرسال بث "${event.content || "الجمعة البيضاء"}" إلى ${event.recipient || "2,410"} جهة اتصال`
          : `Broadcast "${event.content || "White Friday early access"}" sent to ${event.recipient || "2,410"} contacts`,
        subtitle: event.stats
          ? `${event.stats.opened || "41%"} opened · ${event.stats.clicked || "9.8%"} clicked`
          : undefined,
      }

    case "token_warning":
      return {
        title: isAr
          ? `ينتهي تصريح انستغرام خلال 6 أيام. أعد الربط لتجنب فقدان الرسائل.`
          : `Instagram token expires in 6 days. Reconnect to avoid missed DMs.`,
      }

    default:
      return {
        title: isAr
          ? `تم إرسال رسالة تلقائية إلى `
          : `Automated message sent to `,
        actorHighlight: `@${event.recipient || "customer"}`,
        subtitle: event.content,
      }
  }
}

/**
 * Standard default activity items representing live automations when no live socket feed is available.
 */
export const DEFAULT_ACTIVITY_EVENTS: ActivityEvent[] = [
  {
    id: "act-1",
    type: "ai_lead",
    channel: "instagram",
    recipient: "mariam.k",
    content: "عايزة أعرف السيروم ينفع للبشرة الحساسة؟ وبكام التوصيل لمدينة نصر",
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: "act-2",
    type: "order",
    channel: "whatsapp",
    orderId: "1042",
    amount: "EGP 1,350",
    provider: "Paymob",
    flowName: "Glow kit — Reel comment",
    createdAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
  },
  {
    id: "act-3",
    type: "takeover",
    channel: "messenger",
    actor: "Lina M.",
    reason: "customer asked for a refund",
    createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
  },
  {
    id: "act-4",
    type: "broadcast",
    channel: "telegram",
    content: "White Friday early access",
    recipient: "2,410",
    stats: { opened: "41%", clicked: "9.8%" },
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: "act-5",
    type: "token_warning",
    channel: "instagram",
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
]
