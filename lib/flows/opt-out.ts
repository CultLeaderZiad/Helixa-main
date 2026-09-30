const OPT_OUT = new Set([
  "stop",
  "unsubscribe",
  "opt out",
  "opt-out",
  "optout",
  "cancel",
  "إلغاء",
  "الغاء",
  "توقف",
  "ايقاف",
  "إيقاف",
])

/** Exact opt-out words, or a button payload of OPT_OUT. */
export function isOptOutText(value: string | null | undefined): boolean {
  const text = (value || "").trim().toLowerCase().replace(/\s+/g, " ")
  if (!text) return false
  if (text === "opt_out") return true
  return OPT_OUT.has(text)
}
