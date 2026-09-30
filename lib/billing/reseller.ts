export const CLIENT_CURRENCIES = ["usd", "egp", "sar", "aed", "qar", "kwd", "bhd", "omr"] as const
export type ClientCurrency = (typeof CLIENT_CURRENCIES)[number]
export type ClientInterval = "month" | "year"
export type ClientProvider = "stripe" | "paymob" | "tap"

export interface ClientPrice {
  amountCents: number
  currency: ClientCurrency
  interval: ClientInterval
  provider: ClientProvider
}

export function minorUnitDigits(currency: string): number {
  const code = currency.toLowerCase()
  if (code === "kwd" || code === "bhd" || code === "omr") return 3
  return 2
}

/** Minor units to the decimal string Tap and statement text expect. */
export function majorAmount(amountCents: number, currency: string): string {
  const digits = minorUnitDigits(currency)
  return (amountCents / 10 ** digits).toFixed(digits)
}

export function normalizeClientPrice(input: {
  amountCents: unknown
  currency: unknown
  interval: unknown
  provider: unknown
}): { ok: true; price: ClientPrice } | { ok: false; error: string } {
  const amount = Number(input.amountCents)
  if (!Number.isInteger(amount) || amount < 100) {
    return { ok: false, error: "Amount must be an integer of at least 100 minor units." }
  }
  if (amount > 100_000_000) return { ok: false, error: "Amount is too large." }
  const currency = String(input.currency || "").trim().toLowerCase()
  if (!(CLIENT_CURRENCIES as readonly string[]).includes(currency)) {
    return { ok: false, error: "Currency must be one of USD, EGP, SAR, AED, QAR, KWD, BHD, OMR." }
  }
  const interval = input.interval === "year" ? "year" : input.interval === "month" ? "month" : null
  if (!interval) return { ok: false, error: "Interval must be month or year." }
  const provider = input.provider === "stripe" || input.provider === "paymob" || input.provider === "tap" ? input.provider : null
  if (!provider) return { ok: false, error: "Provider must be stripe, paymob, or tap." }
  return { ok: true, price: { amountCents: amount, currency: currency as ClientCurrency, interval, provider } }
}

export function invoiceForPrice(price: ClientPrice, nowMs: number): {
  amountCents: number
  currency: ClientCurrency
  provider: ClientProvider
  status: "open"
  periodStart: string
  periodEnd: string
  dueAt: string
} {
  const start = new Date(nowMs)
  const end = new Date(nowMs)
  if (price.interval === "year") end.setUTCFullYear(end.getUTCFullYear() + 1)
  else end.setUTCMonth(end.getUTCMonth() + 1)
  return {
    amountCents: price.amountCents,
    currency: price.currency,
    provider: price.provider,
    status: "open",
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    dueAt: start.toISOString(),
  }
}
