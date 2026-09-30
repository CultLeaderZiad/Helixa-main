import assert from "node:assert/strict"
import { describe, it } from "node:test"

const { normalizeRegion, dmMessagingAllowed, commentToMessageAllowed, COMMENT_TO_MESSAGE_REGIONS } = await import("../lib/tiktok/region.ts")
const { judgeTikTokSend, recordUserMessage, takeTikTokRequestSlot, TIKTOK_MAX_MESSAGES, TIKTOK_WINDOW_MS, resetTikTokRateLimiter } = await import("../lib/tiktok/quota.ts")
const { normalizeTikTokWebhook } = await import("../lib/tiktok/events.ts")
const { createTikTokAdapter } = await import("../lib/channels/adapters.ts")
const { buildRefLink } = await import("../lib/growth/tools.ts")
const { suggestedQuestionsBody, publicCommentReplyBody, tiktokDmPlan, instagramCrossPostPlan, tiktokMeLink } = await import("../lib/tiktok/features.ts")
const { matchTikTokIntent } = await import("../lib/tiktok/intents.ts")
const { evaluateBroadcastCompliance, flowSendAllowed } = await import("../lib/flows/policy.ts")
const { triggerMatches } = await import("../lib/flows/match.ts")
const { matchDmRule } = await import("../lib/channels/match.ts")
const { readTikTokSettings } = await import("../lib/tiktok/settings.ts")

const HOUR = 60 * 60 * 1000

describe("TikTok region gating", () => {
  it("allows Egypt and the GCC, and blocks the EEA, Switzerland, the UK, and the US", () => {
    for (const region of ["EG", "SA", "AE", "QA", "KW", "BH", "OM", "egypt", "UAE", "KSA"]) {
      assert.equal(dmMessagingAllowed(region, { usReviewApproved: false }).allowed, true, region)
    }
    for (const region of ["DE", "FR", "GB", "UK", "CH", "EL"]) {
      assert.equal(dmMessagingAllowed(region, { usReviewApproved: true }).allowed, false, region)
    }
    assert.equal(dmMessagingAllowed("DE").reason, "eea")
    assert.equal(dmMessagingAllowed("GB").reason, "uk")
    assert.equal(dmMessagingAllowed("CH").reason, "switzerland")
    assert.equal(dmMessagingAllowed("US", { usReviewApproved: false }).reason, "us")
    assert.equal(dmMessagingAllowed("US", { usReviewApproved: true }).allowed, true)
    assert.equal(dmMessagingAllowed(null).reason, "unknown")
    assert.equal(dmMessagingAllowed(null).allowed, true)
    assert.equal(normalizeRegion("United Arab Emirates"), "AE")
  })

  it("keeps Comment-to-Message on VN, ID, and TH only", () => {
    const previousMessaging = process.env.TIKTOK_MESSAGING_ENABLED
    const previousComment = process.env.TIKTOK_COMMENT_TO_DM_ENABLED
    process.env.TIKTOK_MESSAGING_ENABLED = "true"
    process.env.TIKTOK_COMMENT_TO_DM_ENABLED = "true"
    try {
      assert.deepEqual([...COMMENT_TO_MESSAGE_REGIONS], ["VN", "ID", "TH"])
      assert.equal(commentToMessageAllowed("VN"), true)
      assert.equal(commentToMessageAllowed("ID"), true)
      assert.equal(commentToMessageAllowed("TH"), true)
      assert.equal(commentToMessageAllowed("EG"), false)
      assert.equal(commentToMessageAllowed("SA"), false)
      assert.equal(commentToMessageAllowed(null), true)
      process.env.TIKTOK_COMMENT_TO_DM_ENABLED = ""
      assert.equal(commentToMessageAllowed("VN"), true)
      assert.equal(commentToMessageAllowed(null), false)
      process.env.TIKTOK_COMMENT_TO_DM_ENABLED = "false"
      assert.equal(commentToMessageAllowed("VN"), false)
    } finally {
      if (previousMessaging === undefined) delete process.env.TIKTOK_MESSAGING_ENABLED
      else process.env.TIKTOK_MESSAGING_ENABLED = previousMessaging
      if (previousComment === undefined) delete process.env.TIKTOK_COMMENT_TO_DM_ENABLED
      else process.env.TIKTOK_COMMENT_TO_DM_ENABLED = previousComment
    }
  })
})

describe("TikTok 48-hour window", () => {
  it("allows 10 replies after a user message and resets when they message again", () => {
    const now = Date.UTC(2026, 8, 30, 12, 0, 0)
    assert.equal(judgeTikTokSend({ lastUserMessageAt: null, businessSends: 0, now }).reason, "no_user_message")
    assert.equal(judgeTikTokSend({ lastUserMessageAt: now, businessSends: 0, now, kind: "broadcast" }).reason, "broadcast_forbidden")
    assert.equal(judgeTikTokSend({ lastUserMessageAt: now - TIKTOK_WINDOW_MS - 1, businessSends: 0, now }).reason, "window_expired")

    let state = recordUserMessage(now)
    for (let sent = 0; sent < TIKTOK_MAX_MESSAGES; sent += 1) {
      const verdict = judgeTikTokSend({ ...state, now: now + HOUR })
      assert.equal(verdict.allowed, true, `send ${sent + 1}`)
      state = { ...state, businessSends: state.businessSends + 1 }
    }
    assert.equal(judgeTikTokSend({ ...state, now: now + HOUR }).reason, "message_cap")

    state = recordUserMessage(now + 2 * HOUR)
    assert.equal(state.businessSends, 0)
    assert.equal(judgeTikTokSend({ ...state, now: now + 2 * HOUR }).allowed, true)
    assert.equal(judgeTikTokSend({ ...state, now: now + 2 * HOUR, kind: "sender_action" }).allowed, true)
  })

  it("rate limits the 11th request inside one second", () => {
    let stamps: number[] = []
    const now = 1_700_000_000_000
    for (let i = 0; i < 10; i += 1) {
      const next = takeTikTokRequestSlot(stamps, now + i)
      assert.equal(next.allowed, true)
      stamps = next.stamps
    }
    assert.equal(takeTikTokRequestSlot(stamps, now + 10).allowed, false)
    assert.equal(takeTikTokRequestSlot(stamps, now + 1001).allowed, true)
  })

  it("refuses TikTok broadcasts and applies the cap in flow policy", () => {
    const now = Date.UTC(2026, 8, 30, 12, 0, 0)
    assert.equal(evaluateBroadcastCompliance({
      channel: "tiktok",
      now,
      lastInboundAt: new Date(now - HOUR).toISOString(),
      optedIn: true,
      optedOut: false,
    }).reason, "tiktok_broadcast")
    assert.equal(flowSendAllowed({
      channel: "tiktok",
      now,
      lastInboundAt: new Date(now).toISOString(),
      optedIn: false,
      tiktokRegion: "EG",
      tiktokWindow: { lastUserMessageAt: now, businessSends: 10 },
    }).reason, "tiktok_message_cap")
    assert.equal(flowSendAllowed({
      channel: "tiktok",
      now,
      lastInboundAt: null,
      optedIn: false,
      tiktokRegion: "DE",
    }).reason, "tiktok_region")
    assert.equal(flowSendAllowed({
      channel: "tiktok",
      now,
      lastInboundAt: null,
      optedIn: false,
      tiktokWindow: { lastUserMessageAt: null, businessSends: 0 },
    }).reason, "tiktok_user_initiated")
  })
})

describe("TikTok MENA comments and DM features", () => {
  it("reads an organic comment and ignores deletes and replies", () => {
    const inserted = normalizeTikTokWebhook({
      event: "comment.update",
      user_openid: "biz-1",
      content: JSON.stringify({
        comment_id: "c1",
        video_id: "v1",
        comment_type: "comment",
        comment_action: "insert",
        unique_identifier: "user-1",
        text: "PRICE",
      }),
    })
    assert.equal(inserted[0].commentSurface, "organic")
    assert.equal(inserted[0].mediaId, "v1")
    assert.equal(inserted[0].text, "PRICE")

    assert.equal(normalizeTikTokWebhook({
      event: "comment.update",
      user_openid: "biz-1",
      content: { comment_id: "c2", comment_action: "delete", comment_type: "comment", unique_identifier: "user-1", text: "PRICE", video_id: "v1" },
    }).length, 0)
    assert.equal(normalizeTikTokWebhook({
      event: "comment.update",
      user_openid: "biz-1",
      content: { comment_id: "c3", comment_action: "insert", comment_type: "reply", parent_comment_id: "c1", unique_identifier: "user-1", text: "PRICE", video_id: "v1" },
    }).length, 0)
  })

  it("keeps a tiktok.me ref and matches price intent", () => {
    const link = buildRefLink({ channel: "tiktok", handle: "@nour", code: "PRICE", message: "PRICE" })
    assert.equal(link.ok, true)
    if (link.ok) assert.equal(link.url, "https://tiktok.me/nour?ref=PRICE&message=PRICE")
    const direct = tiktokMeLink({ username: "nour", ref: "PRICE" })
    assert.equal(direct.ok && direct.url, "https://tiktok.me/nour?ref=PRICE")

    const dm = normalizeTikTokWebhook({
      event: "im_referral_msg",
      user_openid: "biz-1",
      content: {
        unique_identifier: "user-9",
        conversation_id: "conv-9",
        from_user: { role: "personal_account" },
        referral: { source: "short_link", short_link: { ref: "PRICE", prefilled_message: "PRICE" } },
      },
    })
    assert.equal(dm[0].referral, "PRICE")
    assert.equal(dm[0].text, "PRICE")
    assert.equal(triggerMatches({ type: "ref", channel: "tiktok", refCode: "PRICE" }, dm[0], { tiktokEnabled: true }), true)
    assert.equal(matchTikTokIntent("price", "how much is this"), true)
    assert.equal(matchTikTokIntent("price", "كم السعر"), true)
    const rule = matchDmRule(
      [{ id: "1", trigger_source: "dm", trigger_type: "keyword", trigger_value: "price" }],
      { triggerType: "keyword", text: "how much", replyAll: false, channel: "tiktok" },
    )
    assert.equal(rule?.id, "1")
    assert.equal(triggerMatches({ type: "tiktok_dm", intent: "hello" }, {
      channel: "tiktok",
      kind: "dm",
      text: "مرحبا",
      contactExternalId: "1",
    }, { tiktokEnabled: true }), true)
  })

  it("builds the public reply, the QA card, and the Instagram cross-post plan", () => {
    const body = publicCommentReplyBody({ businessId: "biz", videoId: "v1", commentId: "c1", text: "DM us PRICE" })
    assert.deepEqual(body, { business_id: "biz", video_id: "v1", comment_id: "c1", text: "DM us PRICE" })
    const card = suggestedQuestionsBody(["Price", "Link", "Hello", "Extra"]) as {
      template: { title: string; buttons: Array<{ title: string }> }
    }
    assert.equal(card.template.buttons.length, 3)
    assert.equal(card.template.title.length <= 40, true)
    const plan = tiktokDmPlan({
      firstSeen: true,
      matched: false,
      welcome: "Ahlan",
      defaultReply: "Send PRICE",
      suggestedQuestions: ["Price"],
    })
    assert.equal(plan.sendWelcome && plan.sendQuestions && plan.sendDefault, true)
    const cross = instagramCrossPostPlan("PRICE")
    assert.equal(cross.channel, "instagram")
    assert.equal(cross.flow?.graph.nodes.some((node) => node.type === "trigger"), true)
    const settings = readTikTokSettings({ region: "EG", tiktok_dm: { welcome: "hi", default_reply: "ok", suggested_questions: ["Price"] } })
    assert.equal(settings.region, "EG")
    assert.equal(settings.welcome, "hi")
  })

  it("blocks a German DM and posts a public comment reply", async () => {
    const previous = process.env.TIKTOK_MESSAGING_ENABLED
    process.env.TIKTOK_MESSAGING_ENABLED = "true"
    resetTikTokRateLimiter()
    try {
      const calls: Array<{ url: string; body: string }> = []
      const fetchImpl = async (url: string | URL, init?: RequestInit) => {
        calls.push({ url: String(url), body: String(init?.body || "") })
        return new Response(JSON.stringify({ code: 0, data: { message: { message_id: "m1" } } }), { status: 200 })
      }
      const adapter = createTikTokAdapter(fetchImpl)
      const blocked = await adapter.sendText(
        { accessToken: "tok", recipientId: "conv", senderRef: "biz", tiktokRegion: "DE" },
        "hi",
      )
      assert.equal(blocked.error, "tiktok_region_eea")
      assert.equal(calls.length, 0)

      const capped = await adapter.sendText(
        {
          accessToken: "tok",
          recipientId: "conv",
          senderRef: "biz",
          tiktokRegion: "EG",
          tiktokWindow: { lastUserMessageAt: Date.now(), businessSends: 10 },
        },
        "hi",
      )
      assert.equal(capped.error, "message_cap")

      const reply = await adapter.publicReply!(
        { accessToken: "tok", senderRef: "biz", mediaId: "v1" },
        "c1",
        "Check your DMs",
      )
      assert.equal(reply.ok, true)
      assert.match(calls[0].url, /\/business\/comment\/reply\/create\/$/)
      assert.equal(JSON.parse(calls[0].body).text, "Check your DMs")
    } finally {
      if (previous === undefined) delete process.env.TIKTOK_MESSAGING_ENABLED
      else process.env.TIKTOK_MESSAGING_ENABLED = previous
      resetTikTokRateLimiter()
    }
  })
})
