/**
 * Telegram Bot API helper functions.
 * Mirrors the structure of whatsapp-api.ts and facebook-api.ts.
 */

const TG_API = "https://api.telegram.org"

export interface TgSendResult {
  ok: boolean
  messageId?: number
  error?: string
}

export interface TgBotInfo {
  id: number
  is_bot: boolean
  first_name: string
  username: string
}

export async function getBotInfo(botToken: string): Promise<{ok: boolean, bot?: TgBotInfo, error?: string}> {
  try {
    const res = await fetch(`${TG_API}/bot${botToken}/getMe`)
    const data = await res.json()
    if (data.ok && data.result) {
      return { ok: true, bot: data.result as TgBotInfo }
    }
    console.error("[tg-api] getMe failed:", data)
    return { ok: false, error: data.description || JSON.stringify(data) }
  } catch (e: any) {
    console.error("[tg-api] getMe network error:", e)
    return { ok: false, error: e.message || String(e) }
  }
}

export async function setWebhook(botToken: string, webhookUrl: string): Promise<{ok: boolean, error?: string}> {
  try {
    const res = await fetch(`${TG_API}/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
    const data = await res.json()
    if (data.ok) {
      console.log(`[tg-api] Webhook set successfully: ${webhookUrl}`)
      return { ok: true }
    }
    console.error("[tg-api] setWebhook failed:", data)
    return { ok: false, error: data.description || JSON.stringify(data) }
  } catch (e: any) {
    console.error("[tg-api] setWebhook network error:", e)
    return { ok: false, error: e.message || String(e) }
  }
}

/**
 * Remove the webhook for this bot (used on disconnect).
 */
export async function deleteWebhook(botToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${TG_API}/bot${botToken}/deleteWebhook`)
    const data = await res.json()
    return data.ok === true
  } catch (e) {
    console.error("[tg-api] deleteWebhook error:", e)
    return false
  }
}

/**
 * Send a text message to a Telegram chat.
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  parseMode: "HTML" | "Markdown" | "MarkdownV2" | undefined = undefined,
): Promise<TgSendResult> {
  try {
    const body: any = {
      chat_id: chatId,
      text,
    }
    if (parseMode) {
      body.parse_mode = parseMode
    }

    const res = await fetch(`${TG_API}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (data.ok) {
      return { ok: true, messageId: data.result?.message_id }
    }
    console.error(`[tg-api] sendMessage failed:`, data)
    return { ok: false, error: data.description || "Unknown error" }
  } catch (e) {
    console.error(`[tg-api] sendMessage network error:`, e)
    return { ok: false, error: String(e) }
  }
}
