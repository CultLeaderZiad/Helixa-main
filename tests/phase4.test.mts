import assert from "node:assert/strict"
import crypto from "node:crypto"
import { describe, it } from "node:test"

const { pickChannelConnection } = await import("../lib/channels/pick-connection.ts")
const { createTikTokAdapter, createWebchatAdapter, createWhatsAppAdapter, getAdapter } = await import("../lib/channels/adapters.ts")
const { normalizeWhatsAppBody } = await import("../lib/channels/normalize.ts")
const { normalizeTikTokWebhook } = await import("../lib/tiktok/events.ts")
const { verifyTikTokSignature } = await import("../lib/tiktok/signature.ts")
const { bodyParameterCount, buildTemplatePayload, sendWhatsAppTemplate } = await import("../lib/whatsapp/templates.ts")
const { wabaIdsFromDebugToken } = await import("../lib/whatsapp/connect.ts")
const { originAllowed, consumeWebchatRate } = await import("../lib/webchat/security.ts")
const { hashVisitorSecret } = await import("../lib/webchat/security.ts")
const { listWebchatMessages, openWebchatSession, postWebchatMessage } = await import("../lib/webchat/service.ts")

function jsonResponse(json, ok = true, status = 200) {
  return { ok, status, json: async () => json }
}

function captureFetch(responder) {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init })
    const result = await responder(String(url), init, calls.length)
    return jsonResponse(result.json, result.ok !== false, result.status || 200)
  }
  return { fetchImpl, calls }
}

describe("phase 4 connection routing", () => {
  it("never guesses the first WhatsApp number", () => {
    const rows = [{ page_id: "111" }, { page_id: "222" }]
    assert.equal(pickChannelConnection(rows, "222").row.page_id, "222")
    assert.equal(pickChannelConnection([{ page_id: "111" }], null).row.page_id, "111")
    assert.equal(pickChannelConnection(rows, null).ambiguous, true)
    assert.equal(pickChannelConnection(rows, null).row, null)
    assert.equal(pickChannelConnection(rows, "999").row, null)
    assert.equal(pickChannelConnection([], "111").ambiguous, false)
  })
})

describe("WhatsApp adapter and templates", () => {
  const ctx = { accessToken: "token", recipientId: "15551212", senderRef: "phone-1" }

  it("sends text, buttons, lists, and media through the phone number id", async () => {
    const { fetchImpl, calls } = captureFetch(async () => ({ json: { messages: [{ id: "wamid.1" }] } }))
    const adapter = createWhatsAppAdapter(fetchImpl)
    assert.equal((await adapter.sendText(ctx, "hello")).ok, true)
    assert.equal(JSON.parse(calls[0].init.body).type, "text")
    assert.match(calls[0].url, /\/phone-1\/messages$/)

    await adapter.sendText(ctx, "pick", [{ title: "Yes", payload: "yes" }, { title: "No", payload: "no" }])
    const buttons = JSON.parse(calls[1].init.body)
    assert.equal(buttons.interactive.type, "button")
    assert.equal(buttons.interactive.action.buttons.length, 2)

    await adapter.sendText(ctx, "more", [
      { title: "One", payload: "1" },
      { title: "Two", payload: "2" },
      { title: "Three", payload: "3" },
      { title: "Four", payload: "4" },
    ])
    assert.equal(JSON.parse(calls[2].init.body).interactive.type, "list")

    await adapter.sendMedia(ctx, { type: "document", url: "https://example.com/a.pdf" }, "invoice")
    const media = JSON.parse(calls[3].init.body)
    assert.equal(media.type, "document")
    assert.equal(media.document.link, "https://example.com/a.pdf")
    assert.equal(media.document.caption, "invoice")

    await adapter.sendList(ctx, {
      body: "Choose",
      button: "Menu",
      sections: [{ title: "Main", rows: [{ id: "a", title: "Alpha", description: "First" }] }],
    })
    assert.equal(JSON.parse(calls[4].init.body).interactive.action.button, "Menu")

    const missing = await adapter.sendText({ ...ctx, senderRef: "" }, "nope")
    assert.equal(missing.ok, false)
    assert.equal(calls.length, 5)
  })

  it("normalizes inbound media and template buttons without using the phone id as the recipient", () => {
    const events = normalizeWhatsAppBody({
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          field: "messages",
          value: {
            metadata: { phone_number_id: "phone-1" },
            contacts: [{ profile: { name: "Nour" } }],
            messages: [
              { from: "1555", id: "m1", type: "image", image: { caption: "look" }, timestamp: "10" },
              { from: "1555", id: "m2", type: "button", button: { payload: "YES", text: "Yes" }, timestamp: "11" },
            ],
          },
        }],
      }],
    })
    assert.equal(events[0].text, "[image] look")
    assert.equal(events[0].contactExternalId, "1555")
    assert.equal(events[0].chatId, undefined)
    assert.equal(events[0].accountRef, "phone-1")
    assert.equal(events[1].kind, "postback")
    assert.equal(events[1].text, "YES")
  })

  it("builds and sends an approved template payload", async () => {
    const components = [{ type: "BODY", text: "Hi {{1}}, code {{2}}" }]
    assert.equal(bodyParameterCount(components), 2)
    const payload = buildTemplatePayload({ to: "1555", name: "hello", language: "ar", bodyParameters: ["Nour", "9"] })
    assert.equal(payload.type, "template")
    assert.equal(payload.template.language.code, "ar")
    assert.equal(payload.template.components[0].parameters.length, 2)

    const { fetchImpl, calls } = captureFetch(async () => ({ json: { messages: [{ id: "wamid.t" }] } }))
    const sent = await sendWhatsAppTemplate(fetchImpl, {
      phoneNumberId: "phone-9",
      accessToken: "token",
      to: "1555",
      name: "hello",
      language: "en_US",
    })
    assert.equal(sent.ok, true)
    assert.equal(sent.id, "wamid.t")
    assert.match(calls[0].url, /\/phone-9\/messages$/)
    assert.equal(calls[0].init.headers.Authorization, "Bearer token")
  })

  it("reads WABA ids from an Embedded Signup debug token", () => {
    const ids = wabaIdsFromDebugToken({
      data: {
        granular_scopes: [
          { scope: "whatsapp_business_management", target_ids: ["waba-1"] },
          { scope: "public_profile", target_ids: ["ignore"] },
        ],
      },
    })
    assert.deepEqual(ids, ["waba-1"])
  })
})

describe("TikTok adapter", () => {
  it("sends a conversation message and a comment direct reply only when the flags allow it", async () => {
    const previousMessaging = process.env.TIKTOK_MESSAGING_ENABLED
    const previousComment = process.env.TIKTOK_COMMENT_TO_DM_ENABLED
    process.env.TIKTOK_MESSAGING_ENABLED = ""
    process.env.TIKTOK_COMMENT_TO_DM_ENABLED = ""
    try {
      const { fetchImpl, calls } = captureFetch(async () => ({ json: { code: 0, data: { message: { message_id: "tt-1" } } } }))
      const adapter = createTikTokAdapter(fetchImpl)
      const blocked = await adapter.sendText({ accessToken: "tok", recipientId: "conv-1", senderRef: "open-1" }, "hi")
      assert.equal(blocked.error, "tiktok_messaging_disabled")
      assert.equal(calls.length, 0)

      process.env.TIKTOK_MESSAGING_ENABLED = "true"
      const sent = await adapter.sendText({ accessToken: "tok", recipientId: "conv-1", senderRef: "open-1" }, "hi")
      assert.equal(sent.id, "tt-1")
      const body = JSON.parse(calls[0].init.body)
      assert.equal(body.recipient_type, "CONVERSATION")
      assert.equal(body.recipient, "conv-1")
      assert.equal(body.business_id, "open-1")
      assert.equal(calls[0].init.headers["Access-Token"], "tok")

      const commentOff = await adapter.privateReply({ accessToken: "tok", recipientId: "", senderRef: "open-1", commentId: "c1" }, "thanks")
      assert.equal(commentOff.error, "tiktok_comment_to_dm_disabled")

      process.env.TIKTOK_COMMENT_TO_DM_ENABLED = "true"
      const comment = await adapter.privateReply({ accessToken: "tok", recipientId: "", senderRef: "open-1", commentId: "c1" }, "thanks")
      assert.equal(comment.ok, true)
      const direct = JSON.parse(calls[1].init.body)
      assert.equal(direct.direct_reply.reply_type, "COMMENT_REPLY")
      assert.equal(direct.direct_reply.comment_reply.comment_id, "c1")

      const media = await adapter.sendMedia({ accessToken: "tok", recipientId: "conv-1", senderRef: "open-1" }, { type: "image", url: "https://example.com/a.jpg" })
      assert.equal(media.ok, false)
    } finally {
      if (previousMessaging === undefined) delete process.env.TIKTOK_MESSAGING_ENABLED
      else process.env.TIKTOK_MESSAGING_ENABLED = previousMessaging
      if (previousComment === undefined) delete process.env.TIKTOK_COMMENT_TO_DM_ENABLED
      else process.env.TIKTOK_COMMENT_TO_DM_ENABLED = previousComment
    }
  })

  it("normalizes a DM and a high-intent comment, and checks the webhook signature", () => {
    const dm = normalizeTikTokWebhook({
      event: "im_receive_msg",
      user_openid: "biz-1",
      content: JSON.stringify({
        unique_identifier: "user-9",
        conversation_id: "conv-9",
        message_id: "m9",
        type: "text",
        text: { body: "price" },
        from_user: { id: "u", role: "personal_account" },
        from: "nour",
      }),
    })
    assert.equal(dm[0].kind, "dm")
    assert.equal(dm[0].text, "price")
    assert.equal(dm[0].chatId, "conv-9")
    assert.equal(dm[0].accountRef, "biz-1")

    const comment = normalizeTikTokWebhook({
      event: "im_receive_high_intent_comment",
      user_openid: "biz-1",
      content: { unique_identifier: "user-9", comment_id: "c9", comment_text: "price", from_user: { role: "personal_account" } },
    })
    assert.equal(comment[0].kind, "comment")
    assert.equal(comment[0].commentId, "c9")

    const echo = normalizeTikTokWebhook({
      event: "im_send_msg",
      user_openid: "biz-1",
      content: { unique_identifier: "user-9", message_id: "echo", type: "text", text: { body: "out" }, from_user: { role: "business_account" } },
    })
    assert.equal(echo.length, 0)

    const raw = "{\"ok\":true}"
    const stamp = "1700000000"
    const secret = "client-secret"
    const signature = crypto.createHmac("sha256", secret).update(`${stamp}.${raw}`).digest("hex")
    assert.equal(verifyTikTokSignature(raw, `t=${stamp},s=${signature}`, secret, 1700000100), true)
    assert.equal(verifyTikTokSignature(raw, `t=${stamp},s=${signature}`, secret, 1700000401), false)
    assert.equal(verifyTikTokSignature(raw, `t=${stamp},s=${"0".repeat(signature.length)}`, secret, 1700000100), false)
  })
})

describe("website chat widget", () => {
  it("allows only listed domains and rate limits sends", () => {
    assert.equal(originAllowed("https://shop.example.com", ["example.com"]), false)
    assert.equal(originAllowed("https://shop.example.com", ["*.example.com"]), true)
    assert.equal(originAllowed("https://example.com", ["*.example.com"]), true)
    assert.equal(originAllowed("https://evil.com", []), false)
    assert.equal(originAllowed(null, ["example.com"]), false)
    const first = consumeWebchatRate(null, 1_000, 1, 60_000)
    const second = consumeWebchatRate(first.bucket, 1_500, 1, 60_000)
    assert.equal(first.allowed, true)
    assert.equal(second.allowed, false)
  })

  it("issues a visitor secret, rejects another visitor's secret, and rate limits the message endpoint", async () => {
    const widget = {
      id: "widget-1",
      user_id: 7,
      workspace_id: null,
      public_key: "wk_test",
      name: "Chat",
      greeting: "أهلا",
      color: "#111111",
      locale: "ar",
      allowed_domains: ["example.com"],
      enabled: true,
    }
    const visitors = new Map()
    const rates = new Map()
    const inbound = []
    const greetings = []
    const gateway = {
      async widgetByKey(key) { return key === widget.public_key ? widget : null },
      async visitor(_widgetId, visitorId) { return visitors.get(visitorId) || null },
      async createVisitor(input) { visitors.set(input.visitorId, { secret_hash: input.secretHash }) },
      async rate(key) { return rates.get(key) || null },
      async saveRate(key, bucket) { rates.set(key, bucket) },
      async messages(_widget, visitorId) {
        return [{ id: `m-${visitorId}`, content: "only this visitor", direction: "out", created_at: "2026-09-30T00:00:00.000Z" }]
      },
      async acceptInbound(_widget, visitorId, text, messageId) { inbound.push({ visitorId, text, messageId }) },
      async greet(_widget, visitorId, text) { greetings.push({ visitorId, text }) },
    }
    const caller = { origin: "https://example.com", ip: "203.0.113.4", now: 5_000 }

    const denied = await openWebchatSession(gateway, { ...caller, origin: "https://evil.test" }, { publicKey: widget.public_key })
    assert.equal(denied.status, 403)
    assert.equal(denied.cors, false)

    const opened = await openWebchatSession(gateway, caller, { publicKey: widget.public_key })
    assert.equal(opened.status, 200)
    assert.equal(greetings.length, 1)
    assert.equal(typeof opened.body.secret, "string")
    const visitorId = opened.body.visitorId
    const secret = opened.body.secret

    const other = hashVisitorSecret("not-the-secret")
    visitors.set("someone-else", { secret_hash: other })
    const leaked = await listWebchatMessages(gateway, caller, { publicKey: widget.public_key, visitorId: "someone-else", secret })
    assert.equal(leaked.status, 401)

    const listed = await listWebchatMessages(gateway, caller, { publicKey: widget.public_key, visitorId, secret })
    assert.equal(listed.body.messages[0].id, `m-${visitorId}`)

    const sent = await postWebchatMessage(gateway, { ...caller, sendLimit: 1 }, {
      publicKey: widget.public_key,
      visitorId,
      secret,
      text: "price",
    })
    assert.equal(sent.status, 200)
    assert.equal(inbound[0].text, "price")
    assert.equal(inbound[0].visitorId, visitorId)
    const limited = await postWebchatMessage(gateway, { ...caller, sendLimit: 1, now: 6_000 }, {
      publicKey: widget.public_key,
      visitorId,
      secret,
      text: "again",
    })
    assert.equal(limited.status, 429)
    assert.equal(getAdapter("webchat")?.channel, "webchat")
    assert.equal((await createWebchatAdapter().sendText({ accessToken: "webchat_managed", recipientId: visitorId }, "ok")).ok, true)
  })
})
