import assert from "node:assert/strict"
import { describe, it } from "node:test"

const {
  authorizeWorkspaceAction,
  legacyPermissionLevel,
  pickWorkspace,
  roleAllows,
  workspaceChoiceDenied,
  workspaceRoleFromLegacy,
} = await import("../lib/workspace-access.ts")

const {
  claimEvents,
  deferEvent,
  failEvent,
  failurePlan,
  finishEvent,
  rememberEvent,
  splitInboundEvents,
  takeRateToken,
  DEFAULT_BACKOFF_BASE_MS,
  DEFAULT_MAX_ATTEMPTS,
} = await import("../lib/event-pipeline.ts")

describe("workspace roles", () => {
  it("lets a client-viewer read and blocks them from writes", () => {
    assert.equal(authorizeWorkspaceAction({ role: "client-viewer", method: "GET" }), "ok")
    assert.equal(authorizeWorkspaceAction({ role: "client-viewer", method: "POST" }), "forbidden")
    assert.equal(authorizeWorkspaceAction({ role: "client-viewer", method: "DELETE" }), "forbidden")
  })

  it("lets a member change workspace data but not connect a channel or bill", () => {
    assert.equal(authorizeWorkspaceAction({ role: "member", method: "POST" }), "ok")
    assert.equal(authorizeWorkspaceAction({ role: "member", method: "PUT", minimum: "admin" }), "forbidden")
    assert.equal(authorizeWorkspaceAction({ role: "member", minimum: "owner" }), "forbidden")
    assert.equal(authorizeWorkspaceAction({ role: "admin", minimum: "admin" }), "ok")
    assert.equal(authorizeWorkspaceAction({ role: "admin", minimum: "owner" }), "forbidden")
    assert.equal(authorizeWorkspaceAction({ role: "owner", minimum: "owner" }), "ok")
  })

  it("orders the four roles and maps the old seat names", () => {
    assert.equal(roleAllows("owner", "admin"), true)
    assert.equal(roleAllows("admin", "owner"), false)
    assert.equal(roleAllows("member", "client-viewer"), true)
    assert.equal(workspaceRoleFromLegacy("viewer"), "client-viewer")
    assert.equal(workspaceRoleFromLegacy("editor"), "member")
    assert.equal(legacyPermissionLevel("client-viewer"), "viewer")
    assert.equal(legacyPermissionLevel("member"), "editor")
    assert.equal(legacyPermissionLevel("owner"), "admin")
  })

  it("refuses a workspace the account is not a member of", () => {
    const memberships = [
      { workspaceId: "own", role: "owner" as const, createdAt: "2026-01-01T00:00:00.000Z" },
    ]
    assert.equal(workspaceChoiceDenied(memberships, "other-agency"), true)
    assert.equal(workspaceChoiceDenied(memberships, "own"), false)
    assert.equal(workspaceChoiceDenied(memberships, null), false)
  })

  it("does not pin a multi-agency user to the oldest membership", () => {
    const memberships = [
      { workspaceId: "agency-old", role: "member" as const, createdAt: "2026-01-01T00:00:00.000Z" },
      { workspaceId: "agency-new", role: "admin" as const, createdAt: "2026-06-01T00:00:00.000Z" },
      { workspaceId: "mine", role: "owner" as const, createdAt: "2026-03-01T00:00:00.000Z" },
    ]
    assert.equal(pickWorkspace(memberships, {})?.workspaceId, "mine")
    assert.equal(
      pickWorkspace(memberships, { activeId: "agency-new" })?.workspaceId,
      "agency-new",
    )
    assert.equal(
      pickWorkspace(memberships, { requestedId: "agency-old", activeId: "mine" })?.workspaceId,
      "agency-old",
    )
  })

  it("falls back to the oldest invited workspace only when the account owns none", () => {
    const memberships = [
      { workspaceId: "agency-new", role: "client-viewer" as const, createdAt: "2026-08-01T00:00:00.000Z" },
      { workspaceId: "agency-old", role: "member" as const, createdAt: "2026-02-01T00:00:00.000Z" },
    ]
    assert.equal(pickWorkspace(memberships, {})?.workspaceId, "agency-old")
    assert.equal(pickWorkspace(memberships, { activeId: "missing" })?.workspaceId, "agency-old")
  })
})

describe("inbound idempotency", () => {
  const delivery = {
    object: "instagram",
    entry: [
      {
        id: "1789",
        messaging: [
          { sender: { id: "1" }, recipient: { id: "1789" }, message: { mid: "mid.1", text: "price" } },
          { sender: { id: "1" }, recipient: { id: "1789" }, read: { watermark: 1 } },
        ],
        changes: [{ field: "comments", value: { id: "comment.9", text: "link please" } }],
      },
    ],
  }

  it("keys a message and a comment once, and drops read receipts", () => {
    const pieces = splitInboundEvents("instagram", delivery)
    assert.deepEqual(
      pieces.map((piece) => piece.idempotencyKey),
      ["instagram:messaging:mid.1", "instagram:comments:comment.9"],
    )
    assert.equal(pieces[0].accountKey, "instagram:1789")
  })

  it("treats a Meta retry as a duplicate and does not insert a second row", () => {
    const store = new Map()
    const pieces = splitInboundEvents("instagram", delivery)
    const now = Date.parse("2026-09-30T00:00:00.000Z")
    const accept = (items: typeof pieces) => {
      let accepted = 0
      let duplicates = 0
      for (const piece of items) {
        if (rememberEvent(store, piece, now).inserted) accepted += 1
        else duplicates += 1
      }
      return { accepted, duplicates }
    }
    const first = accept(pieces)
    const retry = accept(splitInboundEvents("instagram", delivery))
    assert.equal(first.accepted, 2)
    assert.equal(retry.accepted, 0)
    assert.equal(retry.duplicates, 2)
    assert.equal(store.size, 2)
  })

  it("uses the Telegram update id and the WhatsApp message id", () => {
    const telegram = splitInboundEvents("telegram", { update_id: 42, message: { text: "hi" } }, { botId: "99" })
    assert.equal(telegram[0].idempotencyKey, "telegram:99:42")
    const whatsapp = splitInboundEvents("whatsapp", {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "waba",
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "555" },
                messages: [{ id: "wamid.1", from: "20100", text: { body: "hi" } }],
              },
            },
          ],
        },
      ],
    })
    assert.equal(whatsapp[0].idempotencyKey, "whatsapp:message:wamid.1")
    assert.equal(whatsapp[0].accountKey, "whatsapp:555")
  })
})

describe("inbound retries", () => {
  const now = Date.parse("2026-09-30T00:00:00.000Z")

  it("backs off and then dead-letters after the attempt cap", () => {
    const store = new Map()
    rememberEvent(store, { idempotencyKey: "instagram:messaging:mid.1", accountKey: "instagram:1789" }, now)
    claimEvents(store, now, 10)

    const first = failEvent(store, "instagram:messaging:mid.1", now, "graph 500")
    assert.equal(first?.status, "pending")
    assert.equal(first?.attempts, 1)
    assert.equal(first?.nextAttemptAt, now + DEFAULT_BACKOFF_BASE_MS)
    assert.equal(failurePlan(1, now).status, "pending")

    for (let attempt = 2; attempt < DEFAULT_MAX_ATTEMPTS; attempt++) {
      const row = failEvent(store, "instagram:messaging:mid.1", now, "graph 500")
      assert.equal(row?.status, "pending")
      assert.equal(row?.attempts, attempt)
    }
    const dead = failEvent(store, "instagram:messaging:mid.1", now, "graph 500")
    assert.equal(dead?.status, "dead")
    assert.equal(dead?.attempts, DEFAULT_MAX_ATTEMPTS)

    const claimed = claimEvents(store, now + 24 * 60 * 60 * 1000, 10)
    assert.equal(claimed.length, 0)
  })

  it("does not claim a row that is waiting on backoff or already done", () => {
    const store = new Map()
    rememberEvent(store, { idempotencyKey: "a", accountKey: "instagram:1" }, now)
    rememberEvent(store, { idempotencyKey: "b", accountKey: "instagram:1" }, now)
    failEvent(store, "a", now, "timeout")
    finishEvent(store, "b", now)

    assert.equal(claimEvents(store, now, 10).length, 0)
    const ready = claimEvents(store, now + DEFAULT_BACKOFF_BASE_MS, 10)
    assert.equal(ready.length, 1)
    assert.equal(ready[0].idempotencyKey, "a")
    assert.equal(ready[0].status, "processing")
  })

  it("reclaims a processing row whose lock expired", () => {
    const store = new Map()
    rememberEvent(store, { idempotencyKey: "a", accountKey: "instagram:1" }, now)
    claimEvents(store, now, 10)
    const again = claimEvents(store, now + 3 * 60_000, 10, 2 * 60_000)
    assert.equal(again.length, 1)
    assert.equal(again[0].idempotencyKey, "a")
  })

  it("rate limits per account without using up a failure attempt", () => {
    const first = takeRateToken(null, now, 2, 60_000)
    assert.equal(first.allowed, true)
    const second = takeRateToken(first.bucket, now + 10, 2, 60_000)
    assert.equal(second.allowed, true)
    const blocked = takeRateToken(second.bucket, now + 20, 2, 60_000)
    assert.equal(blocked.allowed, false)
    assert.equal(blocked.retryAt, now + 60_000)

    const store = new Map()
    rememberEvent(store, { idempotencyKey: "a", accountKey: "instagram:1" }, now)
    claimEvents(store, now, 10)
    const deferred = deferEvent(store, "a", blocked.retryAt)
    assert.equal(deferred?.status, "pending")
    assert.equal(deferred?.attempts, 0)
    assert.equal(claimEvents(store, now, 10).length, 0)
    assert.equal(claimEvents(store, blocked.retryAt, 10).length, 1)

    const reset = takeRateToken(blocked.bucket, now + 60_000, 2, 60_000)
    assert.equal(reset.allowed, true)
    assert.equal(reset.bucket.count, 1)
  })
})
