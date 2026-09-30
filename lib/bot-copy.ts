export type BotLocale = "en" | "ar"

export function botLocale(value: string | null | undefined): BotLocale {
  return value === "ar" ? "ar" : "en"
}

const COPY = {
  en: {
    public1: "Check your inbox! 📥",
    public2: "Sent you a message! 🔥",
    public3: "Check your DMs! ✨",
    leadEmail: "What's your best email address?",
    leadPhone: "What's a good phone number to reach you at?",
    leadName: "What's your name?",
    contentLocked: "Content locked",
    follow: "Follow",
    followed: "I Followed!",
  },
  ar: {
    public1: "شيك على رسائلك! 📥",
    public2: "بعتلك رسالة! 🔥",
    public3: "شوف الخاص! ✨",
    leadEmail: "ما هو أفضل بريد إلكتروني للتواصل معك؟",
    leadPhone: "ما رقم الهاتف المناسب للتواصل معك؟",
    leadName: "ما اسمك؟",
    contentLocked: "المحتوى مقفل",
    follow: "متابعة",
    followed: "تابعت!",
  },
} as const

export type BotCopyKey = keyof (typeof COPY)["en"]

export function botText(locale: BotLocale, key: BotCopyKey): string {
  return COPY[locale][key]
}

export function publicReplies(locale: BotLocale): string[] {
  return [botText(locale, "public1"), botText(locale, "public2"), botText(locale, "public3")]
}

export function followSubtitle(locale: BotLocale, username: string): string {
  const handle = username || "us"
  if (locale === "ar") return `تابع @${handle} عشان تشوف المحتوى.`
  return `Please follow @${handle} to see this.`
}
