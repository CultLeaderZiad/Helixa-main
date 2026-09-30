import assert from "node:assert/strict"
import { beforeEach, describe, it } from "node:test"

process.env.BYOK_ENCRYPTION_SECRET = "phase1-test-secret-value"

const { encryptString } = await import("../lib/crypto.ts")
const {
  isPlaceholderToken,
  looksLikeLegacyCiphertext,
  openAccessToken,
  sealAccessToken,
  tokenNeedsReseal,
} = await import("../lib/token-crypto.ts")
const { isCronAuthorized } = await import("../lib/cron-secret.ts")
const { INSTAGRAM_LOGIN_SCOPES, instagramAppId, safeEqual } = await import("../lib/instagram-oauth.ts")
const { instagramNeedsReconnect, tokenNeedsRefresh } = await import("../lib/instagram-token.ts")
const { hasInstagramCredentials, pickCanonicalProfile } = await import("../lib/tenant-user.ts")
const { aiReplyEvent, pickPageConnection, storyEventKey, telegramMessageId } = await import("../lib/channel-ids.ts")
const { GRAPH_API_VERSION } = await import("../lib/graph.ts")

describe("encryption fails closed", () => {
  beforeEach(() => {
    process.env.BYOK_ENCRYPTION_SECRET = "phase1-test-secret-value"
  })

  it("refuses to encrypt when the secret is missing", () => {
    delete process.env.BYOK_ENCRYPTION_SECRET
    assert.throws(() => encryptString("token"), /BYOK_ENCRYPTION_SECRET is required/)
  })

  it("refuses a secret shorter than 16 characters", () => {
    process.env.BYOK_ENCRYPTION_SECRET = "short"
    assert.throws(() => encryptString("token"), /at least 16 characters/)
  })
})

describe("stored access tokens", () => {
  beforeEach(() => {
    process.env.BYOK_ENCRYPTION_SECRET = "phase1-test-secret-value"
  })

  it("leaves placeholder tokens untouched", () => {
    assert.equal(sealAccessToken("telegram_managed"), "telegram_managed")
    assert.equal(isPlaceholderToken("TEST_TOKEN_NOT_REAL"), true)
    assert.equal(tokenNeedsReseal("facebook_managed"), false)
  })

  it("seals plaintext and opens it back", () => {
    const sealed = sealAccessToken("IGQVJ-plain-token")
    assert.equal(sealed.startsWith("enc:v1:"), true)
    assert.equal(openAccessToken(sealed), "IGQVJ-plain-token")
    assert.equal(tokenNeedsReseal(sealed), false)
    assert.equal(tokenNeedsReseal("IGQVJ-plain-token"), true)
  })

  it("still opens the legacy unprefixed ciphertext", () => {
    const legacy = encryptString("telegram-bot-token")
    assert.equal(looksLikeLegacyCiphertext(legacy), true)
    assert.equal(openAccessToken(legacy), "telegram-bot-token")
  })

  it("passes pre-encryption Meta tokens through until they are resealed", () => {
    assert.equal(openAccessToken("EAA-plaintext-page-token"), "EAA-plaintext-page-token")
  })

  it("throws when a prefixed token cannot be decrypted", () => {
    assert.throws(() => openAccessToken("enc:v1:not-valid-ciphertext"), /Failed to decrypt/)
  })
})

describe("cron authorization", () => {
  it("rejects a missing or mismatched bearer token", () => {
    assert.equal(isCronAuthorized(null, undefined), false)
    assert.equal(isCronAuthorized("Bearer wrong", "expected-secret"), false)
    assert.equal(isCronAuthorized("Bearer expected-secret", "expected-secret"), true)
  })
})

describe("instagram login", () => {
  it("requests the current instagram_business scopes and not the removed ones", () => {
    assert.deepEqual(INSTAGRAM_LOGIN_SCOPES.split(","), [
      "instagram_business_basic",
      "instagram_business_manage_messages",
      "instagram_business_manage_comments",
    ])
  })

  it("compares oauth state in constant time and ignores a length mismatch", () => {
    assert.equal(safeEqual("abc", "abc"), true)
    assert.equal(safeEqual("abc", "abcd"), false)
    assert.equal(safeEqual("abc", "abd"), false)
  })

  it("reads INSTAGRAM_APP_ID before the public fallback", () => {
    process.env.INSTAGRAM_APP_ID = "server-id"
    process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID = "public-id"
    assert.equal(instagramAppId(), "server-id")
    delete process.env.INSTAGRAM_APP_ID
    assert.equal(instagramAppId(), "public-id")
  })

  it("pins Graph calls to a version that is still supported", () => {
    assert.equal(GRAPH_API_VERSION, "v25.0")
    assert.notEqual(GRAPH_API_VERSION, "v20.0")
  })
})

describe("token refresh and reconnect", () => {
  const now = Date.parse("2026-09-30T00:00:00.000Z")

  it("refreshes a token inside the 10 day window that is older than 24 hours", () => {
    assert.equal(
      tokenNeedsRefresh(
        {
          access_token: "enc:v1:sealed",
          token_expires_at: "2026-10-05T00:00:00.000Z",
          token_refreshed_at: "2026-09-20T00:00:00.000Z",
        },
        now,
      ),
      true,
    )
  })

  it("skips tokens that are young, far from expiry, expired, or already rejected", () => {
    assert.equal(
      tokenNeedsRefresh(
        {
          access_token: "enc:v1:sealed",
          token_expires_at: "2026-10-05T00:00:00.000Z",
          token_refreshed_at: "2026-09-29T12:00:00.000Z",
        },
        now,
      ),
      false,
    )
    assert.equal(
      tokenNeedsRefresh(
        { access_token: "enc:v1:sealed", token_expires_at: "2026-12-01T00:00:00.000Z" },
        now,
      ),
      false,
    )
    assert.equal(
      tokenNeedsRefresh(
        { access_token: "enc:v1:sealed", token_expires_at: "2026-09-01T00:00:00.000Z" },
        now,
      ),
      false,
    )
    assert.equal(
      tokenNeedsRefresh(
        {
          access_token: "enc:v1:sealed",
          token_expires_at: "2026-10-05T00:00:00.000Z",
          reconnect_required: true,
        },
        now,
      ),
      false,
    )
    assert.equal(
      tokenNeedsRefresh({ access_token: "telegram_managed", token_expires_at: "2026-10-05T00:00:00.000Z" }, now),
      false,
    )
  })

  it("asks for a reconnect when Meta rejected the token or it is already expired", () => {
    assert.equal(instagramNeedsReconnect({ business_account_id: "1", reconnect_required: true }), true)
    assert.equal(
      instagramNeedsReconnect({ page_id: "1", token_expires_at: "2020-01-01T00:00:00.000Z" }),
      true,
    )
    assert.equal(instagramNeedsReconnect({ access_token: "telegram_managed" }), false)
    assert.equal(instagramNeedsReconnect({ business_account_id: "1", token_expires_at: "2099-01-01T00:00:00.000Z" }), false)
  })
})

describe("one profile per account", () => {
  it("keeps the oldest row as the tenant key", () => {
    const oldest = { id: 20, created_at: "2026-01-01T00:00:00.000Z", access_token: "telegram_managed" }
    const newer = { id: 10, created_at: "2026-02-01T00:00:00.000Z", business_account_id: "ig" }
    assert.equal(pickCanonicalProfile([newer, oldest])?.id, 20)
    assert.equal(hasInstagramCredentials(oldest), false)
    assert.equal(hasInstagramCredentials(newer), true)
  })
})

describe("channel event helpers", () => {
  it("scopes telegram message ids by chat", () => {
    assert.equal(telegramMessageId("100", 7), "tg_100_7")
    assert.notEqual(telegramMessageId("100", 7), telegramMessageId("200", 7))
  })

  it("logs AI replies without a fake automation id", () => {
    assert.deepEqual(aiReplyEvent({ userId: 5, platform: "instagram", recipientId: "sender" }), {
      user_id: 5,
      automation_id: null,
      event_type: "ai_reply",
      recipient_id: "sender",
      platform: "instagram",
    })
  })

  it("prefers the messenger connection when both rows exist", () => {
    const picked = pickPageConnection([
      { platform: "facebook", page_id: "1" },
      { platform: "messenger", page_id: "1" },
    ])
    assert.equal(picked?.platform, "messenger")
  })

  it("keys a story reply so a later DM rule can skip it", () => {
    assert.equal(
      storyEventKey({
        sender: { id: "9" },
        message: { mid: "m1", reply_to: { story: { id: "story-1" } } },
      }),
      "story:9:m1",
    )
    assert.equal(storyEventKey({ sender: { id: "9" }, message: { mid: "m2" } }), null)
  })
})
