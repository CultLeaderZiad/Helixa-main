import assert from "node:assert/strict"
import { describe, it } from "node:test"

const { activatePlan, scheduleCancel, deactivatePlan, startTrialPlan, syncLegacyPlanMirrors, legacyPlanValue, resolveInterval } =
  await import("../lib/billing/activation.ts")
const { minorUnits } = await import("../lib/money.ts")
const { markIntentPaid, recordPaymentIntent, recordPaymentReceipt } = await import("../lib/commerce/intents.ts")

// Minimal chainable Supabase mock: filters apply to the seeded rows, writes are
// recorded, and terminal calls resolve the matching seed rows.
function makeClient(seed: Record<string, any[]> = {}) {
  const writes: any[] = []
  return {
    writes,
    from(table: string) {
      const state: any = { table, op: "select", filters: [], values: null, opts: null, selected: false }
      const matches = () => (seed[table] || []).filter((row) => state.filters.every((f: any) => f(row)))
      const query: any = {
        select(_cols?: string) {
          state.selected = true
          return query
        },
        update(values: any) {
          state.op = "update"
          state.values = values
          writes.push(state)
          return query
        },
        insert(values: any) {
          state.op = "insert"
          state.values = values
          writes.push(state)
          return query
        },
        upsert(values: any, opts?: any) {
          state.op = "upsert"
          state.values = values
          state.opts = opts
          writes.push(state)
          return { error: null }
        },
        delete() {
          state.op = "delete"
          writes.push(state)
          return query
        },
        eq(column: string, value: unknown) {
          state.filters.push((row: any) => row[column] === value)
          return query
        },
        in(column: string, values: unknown[]) {
          state.filters.push((row: any) => values.includes(row[column]))
          return query
        },
        order() {
          return query
        },
        limit() {
          return query
        },
        maybeSingle() {
          return Promise.resolve({ data: matches()[0] ?? null, error: null })
        },
        single() {
          return Promise.resolve({ data: matches()[0] ?? null, error: null })
        },
        then(resolve: any, reject: any) {
          const rows = matches()
          const data = state.op === "select" ? rows[0] ?? null : rows
          return Promise.resolve({ data, error: null }).then(resolve, reject)
        },
      }
      return query
    },
  }
}

describe("minor units", () => {
  it("uses 3 decimals for Gulf/Jordan dinars, 0 for JPY-family, else 2", () => {
    for (const code of ["KWD", "BHD", "OMR", "JOD", "kwd"]) assert.equal(minorUnits(code), 3)
    for (const code of ["JPY", "CNH", "KRW"]) assert.equal(minorUnits(code), 0)
    for (const code of ["USD", "EGP", "SAR", "GBP"]) assert.equal(minorUnits(code), 2)
  })
})

describe("interval resolution", () => {
  it("maps only 'year' to year and everything else to month", () => {
    assert.equal(resolveInterval({ interval: "year" }), "year")
    assert.equal(resolveInterval({ interval: "month" }), "month")
    assert.equal(resolveInterval({}), "month")
    assert.equal(resolveInterval(null), "month")
    assert.equal(resolveInterval(undefined), "month")
  })
})

describe("legacy plan mirrors", () => {
  it("maps paid tiers to 'monthly', free to 'trial', and expired to 'expired'", () => {
    assert.equal(legacyPlanValue("creator"), "monthly")
    assert.equal(legacyPlanValue("agency"), "monthly")
    assert.equal(legacyPlanValue("creator_free"), "trial")
    assert.equal(legacyPlanValue("expired"), "expired")
  })
})

describe("activatePlan", () => {
  it("writes billing_accounts first, then legacy-safe mirrors", async () => {
    const client = makeClient({
      billing_accounts: [],
      users: [{ id: 7, account_id: "acc-1" }],
      accounts: [{ id: "acc-1" }],
      subscriptions: [],
    })
    await activatePlan(
      {
        accountId: "acc-1",
        planId: "agency",
        interval: "year",
        source: "stripe",
        providerRef: "sub_123",
        periodEnd: "2027-01-01T00:00:00.000Z",
      },
      client,
    )

    const billing = client.writes[0]
    assert.equal(billing.table, "billing_accounts")
    assert.equal(billing.op, "upsert")
    assert.equal(billing.values.plan_id, "agency")
    assert.equal(billing.values.status, "active")
    assert.equal(billing.values.interval, "year")
    assert.equal(billing.values.provider, "stripe")
    assert.equal(billing.values.provider_subscription_id, "sub_123")
    assert.equal(billing.opts.onConflict, "account_id")

    const accounts = client.writes.find((w) => w.table === "accounts")
    const users = client.writes.find((w) => w.table === "users")
    assert.equal(accounts.values.plan, "monthly")
    assert.equal(users.values.plan, "monthly")
    // Never write a real plan slug into the CHECK-constrained mirror column.
    assert.ok(!["creator", "agency", "creator_free"].includes(accounts.values.plan))

    const subs = client.writes.find((w) => w.table === "subscriptions")
    assert.equal(subs.values.plan_type, "monthly")
    assert.equal(subs.values.status, "active")
    assert.equal(subs.values.user_id, 7)
  })

  it("refuses a blocked plan", async () => {
    const client = makeClient({ users: [], accounts: [] })
    await assert.rejects(
      () => activatePlan({ accountId: "acc-1", planId: "expired", source: "stripe" }, client),
      /blocked plan/,
    )
  })
})

describe("scheduleCancel", () => {
  it("keeps the paid period: flips cancel_at_period_end without canceling status", async () => {
    const client = makeClient({ billing_accounts: [{ account_id: "acc-1", status: "active" }] })
    await scheduleCancel({ accountId: "acc-1", periodEnd: "2026-12-01T00:00:00.000Z" }, client)

    const billing = client.writes.find((w) => w.table === "billing_accounts")
    assert.equal(billing.values.cancel_at_period_end, true)
    assert.equal(billing.values.current_period_end, "2026-12-01T00:00:00.000Z")
    assert.equal(billing.values.status, undefined)
    // No legacy plan is rewritten to expired/canceling.
    assert.equal(client.writes.find((w) => w.table === "accounts"), undefined)
    assert.equal(client.writes.find((w) => w.table === "users"), undefined)
  })

  it("refuses when no active paid row matches", async () => {
    const client = makeClient({ billing_accounts: [] })
    await assert.rejects(() => scheduleCancel({ accountId: "acc-1" }, client), /No active paid plan/)
  })
})

describe("deactivatePlan", () => {
  it("drops the entitlement to expired across billing_accounts and mirrors", async () => {
    const client = makeClient({
      billing_accounts: [{ account_id: "acc-1", status: "active" }],
      users: [{ id: 7, account_id: "acc-1" }],
      accounts: [{ id: "acc-1" }],
      subscriptions: [],
    })
    await deactivatePlan({ accountId: "acc-1", source: "stripe", providerRef: "sub_123" }, client)

    const billing = client.writes.find((w) => w.table === "billing_accounts")
    assert.equal(billing.values.status, "canceled")
    assert.equal(billing.values.current_period_end, null)
    assert.equal(client.writes.find((w) => w.table === "accounts").values.plan, "expired")
    assert.equal(client.writes.find((w) => w.table === "users").values.plan, "expired")
    const subs = client.writes.find((w) => w.table === "subscriptions")
    assert.equal(subs.values.plan_type, "expired")
    assert.equal(subs.values.status, "canceled")
  })
})

describe("trial and plan-change mirrors", () => {
  it("starts a trial with status trialing and a trial legacy plan", async () => {
    const client = makeClient({ users: [{ id: 7, account_id: "acc-1" }], accounts: [{ id: "acc-1" }], subscriptions: [] })
    await startTrialPlan({ accountId: "acc-1", planId: "creator", trialEndsAt: "2026-11-01T00:00:00.000Z" }, client)

    const billing = client.writes.find((w) => w.table === "billing_accounts")
    assert.equal(billing.values.status, "trialing")
    assert.equal(billing.values.trial_ends_at, "2026-11-01T00:00:00.000Z")
    assert.equal(client.writes.find((w) => w.table === "accounts").values.plan, "trial")
    assert.equal(client.writes.find((w) => w.table === "subscriptions").values.status, "trialing")
  })

  it("syncs legacy mirrors to a legacy-safe value", async () => {
    const client = makeClient({ accounts: [{ id: "acc-1" }], users: [{ id: 7, account_id: "acc-1" }] })
    await syncLegacyPlanMirrors("acc-1", "agency_pro", client)
    assert.equal(client.writes.find((w) => w.table === "accounts").values.plan, "monthly")
    assert.equal(client.writes.find((w) => w.table === "users").values.plan, "monthly")
  })
})

describe("payment intents", () => {
  it("compare-and-set moves pending to paid and reports a replay as no-op", async () => {
    const won = makeClient({ payment_intents: [{ id: "pi-1", provider: "paymob", provider_order_id: "o-1", status: "pending" }] })
    const paid = await markIntentPaid(won, "pi-1")
    assert.equal(paid?.id, "pi-1")

    const replay = makeClient({ payment_intents: [{ id: "pi-1", status: "paid" }] })
    assert.equal(await markIntentPaid(replay, "pi-1"), null)
  })

  it("records an intent only with an account and a provider order id, uppercasing currency", async () => {
    const skipped = makeClient({ payment_intents: [] })
    assert.equal(
      await recordPaymentIntent(skipped, { accountId: null, provider: "paymob", providerOrderId: "o-1", amountMinor: 100, currency: "usd" }),
      false,
    )
    assert.equal(skipped.writes.length, 0)

    const client = makeClient({ payment_intents: [] })
    await recordPaymentIntent(client, {
      accountId: "acc-1",
      orderId: "order-1",
      provider: "paymob",
      providerOrderId: "o-1",
      amountMinor: 199.6,
      currency: "egp",
    })
    const write = client.writes[0]
    assert.equal(write.values.currency, "EGP")
    assert.equal(write.values.amount_minor, 200)
    assert.equal(write.opts.onConflict, "provider,provider_order_id")
  })

  it("writes receipts idempotently on provider + transaction id", async () => {
    const client = makeClient({ payment_receipts: [] })
    await recordPaymentReceipt(client, {
      provider: "tap",
      providerOrderId: "ch-1",
      transactionId: "ch-1",
      accountId: "acc-1",
      amountMinor: 5000,
      currency: "aed",
      status: "paid",
    })
    const write = client.writes[0]
    assert.equal(write.table, "payment_receipts")
    assert.equal(write.values.currency, "AED")
    assert.equal(write.opts.onConflict, "provider,transaction_id")
    assert.equal(write.opts.ignoreDuplicates, true)
  })
})
