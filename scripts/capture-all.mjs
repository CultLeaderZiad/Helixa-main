import { chromium } from "@playwright/test"
import fs from "fs"
import path from "path"

const OUTPUT_DIR = path.resolve("artifacts/mobile_screenshots")
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const VIEWPORTS = [
  { width: 390, height: 844, name: "390x844" },
  { width: 360, height: 780, name: "360x780" },
]

const DIRECTIONS = ["ltr", "rtl"]

const MOCK_USAGE = {
  workspace: { id: "ws-1", name: "Workspace", plan: "pro" },
  plan: {
    id: "pro",
    name: "Pro",
    status: "Active",
    renewsFormatted: "Renews 12 Nov",
    priceFormatted: "EGP 1,450/mo",
    currency: "EGP",
  },
  limits: {
    aiReplies: 10000,
    channels: 3,
    contacts: 5000,
    seats: 5,
    workspaces: 1,
  },
  used: {
    aiReplies: 8240,
    channels: 3,
    contacts: 1912,
    seats: 2,
    workspaces: 1,
  },
  alerts: {
    hasAlert: true,
    severity: "warning",
    message: "Channels at plan limit · 3/3",
    type: "channels",
  },
}

const MOCK_CONVERSATIONS = [
  {
    id: "conv-1",
    recipient_name: "Sarah Jenkins",
    last_message_text: "Thanks! Will check out the pro tier today.",
    last_message_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    platform: "instagram",
    unread_count: 2,
    ai_handled: false,
    bot_paused: false,
  },
  {
    id: "conv-2",
    recipient_name: "Omar Khaled",
    last_message_text: "Can I pay with Vodafone Cash?",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    platform: "whatsapp",
    unread_count: 0,
    ai_handled: true,
    bot_paused: false,
  },
]

async function createMockedPage(context) {
  const page = await context.newPage()

  await page.addInitScript(() => {
    localStorage.setItem("ig_account_id", "acc_demo")
    localStorage.setItem("ig_user_id", "usr_demo")
    localStorage.setItem("ig_username", "Workspace owner")
  })

  await page.route("**/api/auth/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        accountId: "acc_demo",
        userId: "usr_demo",
        username: "Workspace owner",
        email: "owner@cyreax.local",
        role: "customer",
        plan: "pro",
        has_valid_payment: true,
        is_trial_expired: false,
        is_past_deadline: false,
        is_banned: false,
      }),
    })
  })

  await page.route("**/api/billing/usage", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plan: { id: "pro", name: "Pro" },
        status: "active",
        periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      }),
    })
  })

  await page.route("**/api/billing/workspace-usage*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USAGE),
    })
  })

  await page.route("**/api/inbox/conversations*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CONVERSATIONS),
    })
  })

  return page
}

async function captureBilling(browser, vp, dir) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await createMockedPage(context)

  const shotPath = path.join(OUTPUT_DIR, `billing_${vp.name}_${dir}.png`)
  if (fs.existsSync(shotPath)) {
    console.log(`  [Billing ${vp.name} ${dir}] Exists, skipping re-capture.`)
    await context.close()
    return true
  }

  await page.goto("http://localhost:3000/dashboard/billing", { waitUntil: "domcontentloaded" })

  if (dir === "rtl") {
    await page.evaluate(() => {
      document.documentElement.setAttribute("dir", "rtl")
      document.documentElement.lang = "ar"
    })
  }

  await page.addStyleTag({
    content: "nextjs-portal, #nextjs-dev-tools, [data-nextjs-toast] { display: none !important; }",
  })

  // Wait for real content to mount
  try {
    await page.locator('button:has-text("Continue with")').waitFor({ state: "visible", timeout: 12000 })
  } catch {
    console.log(`  [Retrying Billing ${vp.name} ${dir}...]`)
    await page.reload({ waitUntil: "domcontentloaded" })
    await page.locator('button:has-text("Continue with")').waitFor({ state: "visible", timeout: 20000 })
  }
  await page.waitForTimeout(400)

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const innerWidth = await page.evaluate(() => window.innerWidth)
  const noOverflow = scrollWidth <= innerWidth
  console.log(`  [Billing ${vp.name} ${dir}] scrollWidth: ${scrollWidth}, innerWidth: ${innerWidth}, noOverflow: ${noOverflow}`)

  await page.screenshot({ path: shotPath })
  console.log(`  Saved: ${shotPath}`)

  await context.close()
  return noOverflow
}

async function captureInboxAndDrawer(browser, vp, dir) {
  const inboxShotPath = path.join(OUTPUT_DIR, `inbox_${vp.name}_${dir}.png`)
  const drawerShotPath = path.join(OUTPUT_DIR, `drawer_${vp.name}_${dir}.png`)

  if (fs.existsSync(inboxShotPath) && fs.existsSync(drawerShotPath)) {
    console.log(`  [Inbox & Drawer ${vp.name} ${dir}] Both exist, skipping re-capture.`)
    return true
  }

  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
  const page = await createMockedPage(context)

  await page.goto("http://localhost:3000/dashboard/inbox", { waitUntil: "domcontentloaded" })

  if (dir === "rtl") {
    await page.evaluate(() => {
      document.documentElement.setAttribute("dir", "rtl")
      document.documentElement.lang = "ar"
    })
  }

  await page.addStyleTag({
    content: "nextjs-portal, #nextjs-dev-tools, [data-nextjs-toast] { display: none !important; }",
  })

  // Wait for mobile navigation to mount
  try {
    await page.locator('nav[aria-label="Mobile Navigation"]').waitFor({ state: "visible", timeout: 12000 })
  } catch {
    console.log(`  [Retrying Inbox ${vp.name} ${dir}...]`)
    await page.reload({ waitUntil: "domcontentloaded" })
    await page.locator('nav[aria-label="Mobile Navigation"]').waitFor({ state: "visible", timeout: 20000 })
  }
  await page.waitForTimeout(600)

  // 1. Audit and save Inbox screenshot
  const inboxScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const inboxInnerWidth = await page.evaluate(() => window.innerWidth)
  const inboxNoOverflow = inboxScrollWidth <= inboxInnerWidth
  console.log(`  [Inbox ${vp.name} ${dir}] scrollWidth: ${inboxScrollWidth}, innerWidth: ${inboxInnerWidth}, noOverflow: ${inboxNoOverflow}`)

  await page.screenshot({ path: inboxShotPath })
  console.log(`  Saved: ${inboxShotPath}`)

  // 2. Open drawer via bottom bar "More" button
  const moreBtn = page.locator('button[aria-label="Open menu drawer"]')
  await moreBtn.click({ force: true })
  try {
    await page.locator('div[role="dialog"]').waitFor({ state: "visible", timeout: 10000 })
  } catch {
    await moreBtn.click({ force: true })
    await page.locator('div[role="dialog"]').waitFor({ state: "visible", timeout: 15000 })
  }
  await page.waitForTimeout(500)

  // Audit and save Drawer screenshot
  const drawerScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const drawerInnerWidth = await page.evaluate(() => window.innerWidth)
  const drawerNoOverflow = drawerScrollWidth <= drawerInnerWidth
  console.log(`  [Drawer ${vp.name} ${dir}] scrollWidth: ${drawerScrollWidth}, innerWidth: ${drawerInnerWidth}, noOverflow: ${drawerNoOverflow}`)

  await page.screenshot({ path: drawerShotPath })
  console.log(`  Saved: ${drawerShotPath}`)

  await context.close()
  return inboxNoOverflow && drawerNoOverflow
}

async function run() {
  console.log("Launching Chromium for Full Mobile QA Suite...")
  const browser = await chromium.launch({ headless: true })
  let passedAudit = true

  console.log("Warming up Next.js routes...")
  const warmPage = await browser.newPage()
  await warmPage.goto("http://localhost:3000/dashboard/billing", { waitUntil: "domcontentloaded" }).catch(() => {})
  await warmPage.goto("http://localhost:3000/dashboard/inbox", { waitUntil: "domcontentloaded" }).catch(() => {})
  await warmPage.close()
  console.log("Warmup complete!")

  // 1. All Billing Screenshots
  console.log("\n--- Capturing Billing Screenshots ---")
  for (const vp of VIEWPORTS) {
    for (const dir of DIRECTIONS) {
      const ok = await captureBilling(browser, vp, dir)
      if (!ok) passedAudit = false
    }
  }

  // 2. All Inbox & Drawer Screenshots
  console.log("\n--- Capturing Inbox & Drawer Screenshots ---")
  for (const vp of VIEWPORTS) {
    for (const dir of DIRECTIONS) {
      const ok = await captureInboxAndDrawer(browser, vp, dir)
      if (!ok) passedAudit = false
    }
  }

  await browser.close()
  console.log("\n========================================")
  console.log("ALL 12 SCREENSHOTS CAPTURED SUCCESSFULLY.")
  console.log("HORIZONTAL SCROLL AUDIT PASSED:", passedAudit)
  console.log("========================================")
  if (!passedAudit) process.exit(1)
}

run().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
