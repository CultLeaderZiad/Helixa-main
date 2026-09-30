export interface MonitorEvent {
  message: string
  name?: string
  stack?: string
  extra?: Record<string, string>
}

const installed = { current: false }

export function errorEvent(error: unknown, extra?: Record<string, string>): MonitorEvent {
  if (error instanceof Error) {
    return { message: error.message.slice(0, 500), name: error.name, stack: error.stack?.slice(0, 2000), extra }
  }
  return { message: String(error).slice(0, 500), extra }
}

export function sentryDsn(): string {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || ""
}

/** Sentry envelope body. The DSN is not required to build it. */
function newEventId(): string {
  const webCrypto = globalThis.crypto
  if (webCrypto && typeof webCrypto.randomUUID === "function") return webCrypto.randomUUID().replace(/-/g, "")
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(32, "0").slice(0, 32)
}

export function buildSentryEnvelope(event: MonitorEvent, eventId = newEventId()): string {
  const header = JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), sdk: { name: "helixa.monitoring", version: "1" } })
  const item = JSON.stringify({ type: "event", length: 0 })
  const payload = JSON.stringify({
    event_id: eventId,
    platform: "node",
    message: event.message,
    exception: event.stack
      ? { values: [{ type: event.name || "Error", value: event.message, stacktrace: { frames: [{ filename: "app", function: "capture", context_line: event.stack.split("\n")[1]?.trim() || "" }] } }] }
      : undefined,
    extra: event.extra,
  })
  return `${header}\n${item}\n${payload}`
}

export function sentryStoreUrl(dsn: string): string | null {
  try {
    const url = new URL(dsn)
    const projectId = url.pathname.replace(/\//g, "")
    if (!projectId || !url.username) return null
    return `${url.protocol}//${url.host}/api/${projectId}/envelope/?sentry_key=${encodeURIComponent(url.username)}`
  } catch {
    return null
  }
}

export async function captureException(error: unknown, extra?: Record<string, string>, fetchImpl: typeof fetch = fetch): Promise<void> {
  const event = errorEvent(error, extra)
  console.error("[helixa]", event.message, extra || "")
  const dsn = sentryDsn()
  const target = dsn ? sentryStoreUrl(dsn) : null
  if (!target) return
  const body = buildSentryEnvelope(event)
  try {
    await fetchImpl(target, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
    })
  } catch (sendError) {
    console.error("[helixa] Sentry envelope failed", sendError instanceof Error ? sendError.message : sendError)
  }
}

export function installProcessHooks(): void {
  if (installed.current || typeof process === "undefined" || !process.on) return
  installed.current = true
  process.on("unhandledRejection", (reason) => {
    void captureException(reason, { source: "unhandledRejection" })
  })
  process.on("uncaughtException", (error) => {
    void captureException(error, { source: "uncaughtException" })
  })
}
