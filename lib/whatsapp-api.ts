const GRAPH = "https://graph.facebook.com/v20.0"

export interface SendResult {
  ok: boolean
  id?: string
  error?: any
}

export interface WAQuickReply {
  title: string
  payload: string
}

async function post(phoneNumberId: string, token: string, body: any): Promise<SendResult> {
  try {
    const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (json.error) {
      console.error(`[wa-api] Send failed:`, JSON.stringify(json.error))
      
      // Check for outside 24-hour window error (error code 131047 or similar for WhatsApp)
      if (json.error.code === 131047) {
        return { ok: false, error: "OUTSIDE_WINDOW" }
      }
      return { ok: false, error: json.error }
    }
    return { ok: true, id: json.messages?.[0]?.id }
  } catch (e) {
    console.error(`[wa-api] Network error:`, e)
    return { ok: false, error: e }
  }
}

export async function sendWhatsAppText(
  phoneNumberId: string,
  token: string,
  recipientPhone: string,
  text: string,
  quickReplies?: WAQuickReply[],
): Promise<SendResult> {
  const body: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
  }

  if (quickReplies?.length) {
    body.type = "interactive"
    body.interactive = {
      type: "button",
      body: { text },
      action: {
        buttons: quickReplies.slice(0, 3).map((q) => ({
          type: "reply",
          reply: {
            id: q.payload,
            title: q.title.slice(0, 20),
          },
        })),
      },
    }
  } else {
    body.type = "text"
    body.text = { body: text, preview_url: true }
  }

  return post(phoneNumberId, token, body)
}

export async function sendWhatsAppTemplate(
  phoneNumberId: string,
  token: string,
  recipientPhone: string,
  templateName: string,
  languageCode = "en_US",
): Promise<SendResult> {
  const body = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
    },
  }
  return post(phoneNumberId, token, body)
}

export async function markWhatsAppSeen(
  phoneNumberId: string,
  token: string,
  messageId: string,
): Promise<SendResult> {
  const body = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  }
  return post(phoneNumberId, token, body)
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, Math.min(ms, 8000)))
}
