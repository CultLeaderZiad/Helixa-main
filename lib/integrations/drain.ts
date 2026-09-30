import { deliverWebhook, deliveryAfterFailure } from "@/lib/integrations/dispatch"
import { decryptString } from "@/lib/crypto"
import type { Db } from "@/lib/channels/types"

function missing(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message || ""
  return error?.code === "42P01" || error?.code === "PGRST205" || /does not exist|Could not find the table/i.test(message)
}

/** Drains signed outgoing webhooks. Failures use the same backoff as the inbound queue. */
export async function drainOutgoingWebhooks(supabase: Db, limit = 20): Promise<{ done: number; retried: number; dead: number }> {
  const summary = { done: 0, retried: 0, dead: 0 }
  const due = await supabase
    .from("outgoing_webhook_deliveries")
    .select("id, endpoint_id, payload, attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .limit(limit)
  if (due.error) {
    if (!missing(due.error)) console.warn("[webhooks] drain skipped:", due.error.message)
    return summary
  }
  for (const row of due.data || []) {
    const endpoint = await supabase.from("outgoing_webhook_endpoints").select("url, secret_ciphertext, enabled").eq("id", row.endpoint_id).maybeSingle()
    const secret = endpoint.data?.secret_ciphertext ? decryptString(endpoint.data.secret_ciphertext) : null
    const body = JSON.stringify(row.payload || {})
    const attempts = Number(row.attempts || 0) + 1
    if (!endpoint.data?.enabled || !secret || !endpoint.data.url) {
      const failed = deliveryAfterFailure(attempts, Date.now())
      await supabase.from("outgoing_webhook_deliveries").update({ ...mapFailure(failed), last_error: "endpoint unavailable" }).eq("id", row.id)
      if (failed.status === "dead") summary.dead += 1
      else summary.retried += 1
      continue
    }
    try {
      const result = await deliverWebhook({ url: endpoint.data.url, secret, body, nowMs: Date.now() })
      if (!result.ok) throw new Error(`HTTP ${result.status}`)
      await supabase.from("outgoing_webhook_deliveries").update({ status: "done", attempts, last_error: null }).eq("id", row.id)
      summary.done += 1
    } catch (error: any) {
      const failed = deliveryAfterFailure(attempts, Date.now())
      await supabase.from("outgoing_webhook_deliveries").update({ ...mapFailure(failed), last_error: String(error?.message || error).slice(0, 300) }).eq("id", row.id)
      if (failed.status === "dead") summary.dead += 1
      else summary.retried += 1
    }
  }
  return summary
}

function mapFailure(failed: { status: string; attempts: number; nextAttemptAt: string }) {
  return { status: failed.status, attempts: failed.attempts, next_attempt_at: failed.nextAttemptAt }
}
