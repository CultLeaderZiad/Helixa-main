import assert from "node:assert/strict"
import { describe, it } from "node:test"

const { detectDialect, replyInstruction } = await import("../lib/ai-agent/dialect.ts")
const { chunkText } = await import("../lib/ai-agent/chunk.ts")
const { hashEmbedding } = await import("../lib/ai-agent/embed.ts")
const { rankChunks } = await import("../lib/ai-agent/retrieve.ts")
const { decideAgentTurn } = await import("../lib/ai-agent/decide.ts")
const { DEFAULT_AGENT_SETTINGS } = await import("../lib/ai-agent/guardrails.ts")
const { normalizeHost, resolveAgencyByHost, isPlatformHost } = await import("../lib/agency/tenant.ts")
const { signWebhook, verifyWebhookSignature, nextWebhookAttempt } = await import("../lib/integrations/webhooks.ts")
const { createPaymobLink, createStripeLink, signPaymob, verifyPaymobHmac } = await import("../lib/commerce/payments.ts")
const { productsToContent } = await import("../lib/commerce/catalog.ts")
const { orderStatusMatches } = await import("../lib/commerce/orders.ts")
const { applyIncoming, initialStepToken } = await import("../lib/flows/engine.ts")

const settings = { ...DEFAULT_AGENT_SETTINGS, qualifyFields: ["name", "phone", "email"] }

function chunk(id: string, content: string, similarity = 0.8) {
  return { id, content, similarity }
}

describe("dialect detection and routing", () => {
  it("detects Egyptian, Gulf varieties, Levantine, MSA, English, and Arabizi", () => {
    const egyptian = detectDialect("عامل ايه يا باشا، عايز حاجة")
    assert.equal(egyptian.dialect, "egyptian")
    assert.equal(egyptian.arabizi, false)
    assert.match(replyInstruction(egyptian), /Egyptian Arabic/)

    const saudi = detectDialect("وش لونك الحين، ابغى الطلب")
    assert.equal(saudi.dialect, "gulf")
    assert.equal(saudi.gulf, "saudi")
    assert.match(replyInstruction(saudi), /Saudi Arabic/)

    const emirati = detectDialect("شحالك اليوم؟")
    assert.equal(emirati.dialect, "gulf")
    assert.equal(emirati.gulf, "emirati")

    const kuwaiti = detectDialect("شلونك شنو الاخبار")
    assert.equal(kuwaiti.dialect, "gulf")
    assert.equal(kuwaiti.gulf, "kuwaiti")
    assert.match(replyInstruction(kuwaiti), /Kuwaiti Arabic/)

    const levantine = detectDialect("كيفك شو الاخبار هلق")
    assert.equal(levantine.dialect, "levantine")
    assert.match(replyInstruction(levantine), /Levantine/)

    const msa = detectDialect("هل يمكنك اخباري بسياسة الاستبدال")
    assert.equal(msa.dialect, "msa")
    assert.match(replyInstruction(msa), /Modern Standard Arabic/)

    const english = detectDialect("how much does this cost please")
    assert.equal(english.dialect, "english")
    assert.equal(english.arabizi, false)

    const arabizi = detectDialect("3ayez a3raf el se3r")
    assert.equal(arabizi.arabizi, true)
    assert.equal(arabizi.dialect, "egyptian")
    assert.match(replyInstruction(arabizi), /Arabizi/)
    assert.match(replyInstruction(arabizi), /Arabic script/)
  })
})

describe("knowledge retrieval", () => {
  it("chunks long text and ranks the passage that shares the query", () => {
    const pieces = chunkText(`${"سياسة الشحن داخل مصر خلال يومين. ".repeat(40)}\n\n${"السيروم سعره ٤٥٠ جنيه للقطعة. ".repeat(5)}`)
    assert.ok(pieces.length >= 2)

    const shipping = "الشحن داخل القاهرة يستغرق يومين والجملة مجانية"
    const serum = "سيروم فيتامين سي السعر ٤٥٠ جنيه"
    const ranked = rankChunks(hashEmbedding("سعر السيروم"), [
      { id: "ship", content: shipping, embedding: hashEmbedding(shipping), embedder: "hash-v1" },
      { id: "serum", content: serum, embedding: hashEmbedding(serum), embedder: "hash-v1" },
    ], "hash-v1", 2)
    assert.equal(ranked[0].id, "serum")
    assert.ok(ranked[0].similarity > ranked[1].similarity)
    assert.deepEqual(hashEmbedding(serum), hashEmbedding(serum))
  })
})

describe("agent guardrails", () => {
  it("keeps a price that is in the knowledge base", () => {
    const decision = decideAgentTurn({
      message: "عايز اعرف بكام السيروم",
      settings,
      retrieved: [chunk("p1", "السيروم ب 450 EGP")],
      modelText: JSON.stringify({ reply: "السيروم ب 450 EGP", confidence: 0.9, handoff: false, used_source_ids: [1] }),
    })
    assert.equal(decision.handoff, false)
    assert.match(decision.reply, /450/)
    assert.equal(decision.sources[0].id, "p1")
    assert.equal(decision.dialect, "egyptian")
  })

  it("refuses a price that is not in the knowledge base and hands off", () => {
    const decision = decideAgentTurn({
      message: "بكام السيروم",
      settings,
      retrieved: [chunk("p1", "السيروم متوفر هذا الأسبوع")],
      modelText: JSON.stringify({ reply: "السيروم ب 500 EGP", confidence: 0.95, handoff: false }),
    })
    assert.equal(decision.handoff, true)
    assert.equal(decision.handoffReason, "invented_price")
    assert.equal(decision.reply.includes("500"), false)
  })

  it("stays on topic when nothing relevant was retrieved", () => {
    const decision = decideAgentTurn({
      message: "what's the weather in paris",
      settings,
      retrieved: [],
      modelText: JSON.stringify({ reply: "It will be sunny all week.", confidence: 0.9, handoff: false }),
    })
    assert.equal(decision.offTopic, true)
    assert.match(decision.reply, /products, services, and policies/)
    assert.equal(decision.handoff, false)
  })

  it("hands off when confidence is low or the customer asks for a person", () => {
    const unsure = decideAgentTurn({
      message: "هل المنتج مناسب للبشرة الحساسة",
      settings,
      retrieved: [chunk("p1", "المنتج مناسب للبشرة الحساسة", 0.9)],
      modelText: JSON.stringify({ reply: "غالباً مناسب.", confidence: 0.2, handoff: false, used_source_ids: [1] }),
    })
    assert.equal(unsure.handoff, true)
    assert.equal(unsure.handoffReason, "low_confidence")

    const human = decideAgentTurn({
      message: "عايز أكلم حد من الفريق",
      settings,
      retrieved: [chunk("p1", "فريق الدعم متاح", 0.9)],
      modelText: JSON.stringify({ reply: "تمام", confidence: 0.99, handoff: false }),
    })
    assert.equal(human.handoff, true)
    assert.equal(human.handoffReason, "human_requested")
  })

  it("writes captured lead fields", () => {
    const decision = decideAgentTurn({
      message: "اسمي سارة ورقمي 01001234567",
      settings,
      retrieved: [chunk("p1", "نسجل بيانات العميل", 0.9)],
      modelText: JSON.stringify({ reply: "تم يا سارة", confidence: 0.8, fields: { name: "سارة" } }),
    })
    assert.equal(decision.fields.name, "سارة")
    assert.equal(decision.fields.phone, "01001234567")
  })
})

describe("tenant resolution", () => {
  const agencies = [
    {
      id: "ag_1",
      name: "North",
      appName: "North",
      logoUrl: null,
      primaryColor: "#112233",
      accentColor: "#e5a93c",
      customDomain: "clients.example.com",
    },
  ]

  it("matches a custom host and ignores the platform host", () => {
    assert.equal(normalizeHost("Clients.Example.com:443"), "clients.example.com")
    assert.equal(resolveAgencyByHost("clients.example.com", agencies, "https://helixa.example")?.id, "ag_1")
    assert.equal(resolveAgencyByHost("https://clients.example.com/inbox", agencies)?.id, "ag_1")
    assert.equal(resolveAgencyByHost("localhost:3000", agencies), null)
    assert.equal(resolveAgencyByHost("helixa.example", agencies, "https://helixa.example"), null)
    assert.equal(isPlatformHost("127.0.0.1"), true)
  })
})

describe("webhook signing and retries", () => {
  it("signs the body and rejects a tampered payload or an old timestamp", () => {
    const body = JSON.stringify({ type: "order.created", data: { id: "o1" } })
    const now = Date.parse("2026-09-30T12:00:00.000Z")
    const headers = {
      "X-Helixa-Timestamp": String(Math.floor(now / 1000)),
      "X-Helixa-Signature": signWebhook("topsecret", Math.floor(now / 1000), body),
    }
    assert.equal(verifyWebhookSignature({
      secret: "topsecret",
      timestamp: headers["X-Helixa-Timestamp"],
      body,
      signature: headers["X-Helixa-Signature"],
      nowMs: now,
    }), true)
    assert.equal(verifyWebhookSignature({
      secret: "topsecret",
      timestamp: headers["X-Helixa-Timestamp"],
      body: body + " ",
      signature: headers["X-Helixa-Signature"],
      nowMs: now,
    }), false)
    assert.equal(verifyWebhookSignature({
      secret: "topsecret",
      timestamp: headers["X-Helixa-Timestamp"],
      body,
      signature: headers["X-Helixa-Signature"],
      nowMs: now + 10 * 60 * 1000,
    }), false)
  })

  it("retries with backoff and then goes dead", () => {
    const now = 1_000_000
    const first = nextWebhookAttempt(1, now, 5)
    const fourth = nextWebhookAttempt(4, now, 5)
    const dead = nextWebhookAttempt(5, now, 5)
    assert.equal(first.status, "pending")
    assert.ok(first.nextAttemptAt > now)
    assert.equal(fourth.status, "pending")
    assert.ok(fourth.nextAttemptAt > first.nextAttemptAt)
    assert.equal(dead.status, "dead")
  })
})

describe("payment links", () => {
  it("creates a Paymob iframe link from the three mocked calls", async () => {
    const calls: string[] = []
    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      const href = String(url)
      calls.push(href)
      const body = JSON.parse(String(init?.body || "{}"))
      if (href.endsWith("/api/auth/tokens")) {
        assert.equal(body.api_key, "api-key")
        return new Response(JSON.stringify({ token: "auth-1" }), { status: 200 })
      }
      if (href.endsWith("/api/ecommerce/orders")) {
        assert.equal(body.amount_cents, 45000)
        assert.equal(body.merchant_order_id, "order-1")
        return new Response(JSON.stringify({ id: 99 }), { status: 200 })
      }
      if (href.endsWith("/api/acceptance/payment_keys")) {
        assert.equal(body.order_id, 99)
        assert.equal(body.integration_id, 77)
        return new Response(JSON.stringify({ token: "pay-1" }), { status: 200 })
      }
      return new Response("no", { status: 404 })
    }
    const link = await createPaymobLink(
      {
        amountCents: 45000,
        currency: "EGP",
        description: "Serum",
        orderId: "order-1",
        successUrl: "https://helixa.example/ok",
        cancelUrl: "https://helixa.example/no",
      },
      { apiKey: "api-key", integrationId: "77", iframeId: "42" },
      fetchImpl as typeof fetch,
    )
    assert.equal(calls.length, 3)
    assert.equal(link.url, "https://accept.paymob.com/api/acceptance/iframes/42?payment_token=pay-1")
    assert.equal(link.reference, "99")
  })

  it("creates a Stripe checkout link and verifies a Paymob callback", async () => {
    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      assert.equal(String(url), "https://api.stripe.com/v1/checkout/sessions")
      assert.match(String(init?.headers && (init.headers as Record<string, string>).Authorization), /Bearer sk_test/)
      const body = String(init?.body)
      const decoded = decodeURIComponent(body)
      assert.match(decoded, /\[unit_amount\]=2500/)
      assert.match(decoded, /\[currency\]=sar/)
      assert.match(body, /client_reference_id=order-2/)
      return new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" }), { status: 200 })
    }
    const link = await createStripeLink(
      {
        amountCents: 2500,
        currency: "SAR",
        description: "Oil",
        orderId: "order-2",
        successUrl: "https://helixa.example/ok",
        cancelUrl: "https://helixa.example/no",
      },
      { secretKey: "sk_test_123" },
      fetchImpl as typeof fetch,
    )
    assert.equal(link.url, "https://checkout.stripe.com/c/pay/cs_1")

    const callback = {
      obj: {
        amount_cents: 2500,
        created_at: "2026-09-30T12:00:00",
        currency: "EGP",
        error_occured: false,
        has_parent_transaction: false,
        id: 10,
        integration_id: 77,
        is_3d_secure: true,
        is_auth: false,
        is_capture: false,
        is_refunded: false,
        is_standalone_payment: true,
        is_voided: false,
        order: { id: 99 },
        owner: 1,
        pending: false,
        source_data: { pan: "2346", sub_type: "MasterCard", type: "card" },
        success: true,
      },
    }
    const hmac = signPaymob(callback, "hmac-secret")
    assert.equal(verifyPaymobHmac(callback, "hmac-secret", hmac), true)
    assert.equal(verifyPaymobHmac(callback, "hmac-secret", "deadbeef"), false)
  })
})

describe("catalog cards and order triggers", () => {
  it("sends one card or a carousel and matches paid orders", () => {
    const one = productsToContent([{ id: "p1", name: "Serum", priceCents: 45000, currency: "EGP", productUrl: "https://shop.example/serum" }])
    assert.equal(one.card?.title, "Serum")
    assert.match(one.card?.subtitle || "", /450 EGP/)

    const many = productsToContent([
      { id: "p1", name: "Serum", priceCents: 45000, currency: "EGP" },
      { id: "p2", name: "Oil", priceCents: 25000, currency: "EGP" },
    ])
    assert.equal(many.cards?.length, 2)
    assert.equal(orderStatusMatches("paid, fulfilled", "paid"), true)
    assert.equal(orderStatusMatches("paid", "cancelled"), false)
    assert.equal(orderStatusMatches("any", "refunded"), true)
  })

  it("turns catalog products into a flow send", () => {
    const graph = {
      nodes: [
        { id: "trigger", type: "trigger" as const, position: { x: 0, y: 0 }, data: {} },
        { id: "cards", type: "product_card" as const, position: { x: 0, y: 0 }, data: { productIds: ["p1", "p2"] } },
      ],
      edges: [{ id: "e", source: "trigger", target: "cards", sourceHandle: "default" }],
    }
    const result = applyIncoming({
      graph,
      run: {
        id: "run-1",
        flowId: "flow-1",
        versionId: "ver-1",
        contactExternalId: "user-1",
        channel: "instagram",
        status: "active",
        currentNodeId: null,
        waitKind: null,
        resumeAt: null,
        expectedPayloads: [],
        stepToken: initialStepToken("run-1"),
        steps: 0,
        context: {},
      },
      contact: {
        channel: "instagram",
        externalId: "user-1",
        tags: [],
        customFields: {},
        botPaused: false,
        optedIn: false,
        optedOut: false,
        isFollower: null,
        lastInboundAt: "2026-09-30T12:00:00.000Z",
      },
      signal: { kind: "start", eventId: "e1", inboundJustNow: true },
      now: Date.parse("2026-09-30T12:00:00.000Z"),
      catalog: [
        { id: "p1", name: "Serum", priceCents: 45000, currency: "EGP" },
        { id: "p2", name: "Oil", priceCents: 20000, currency: "EGP" },
      ],
    })
    const send = result.effects.find((effect) => effect.type === "send")
    assert.ok(send && send.type === "send")
    assert.equal(send.content.cards?.length, 2)
  })
})
