import { chromium } from "@playwright/test"
import fs from "fs"
import path from "path"

const OUTPUT_DIR = path.resolve("artifacts/menu_screenshots")
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const MOCK_USAGE = {
  workspace: { id: "ws-1", name: "Workspace" },
  plan: {
    id: "pro",
    name: "Pro",
    status: "Active",
    renewsFormatted: "Renews 12 Nov",
    priceFormatted: "EGP 1,450/mo",
    currency: "EGP",
    renewalDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    isPlanLimitHit: false,
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
    metric: "channels",
    ratio: 1,
  },
}

const MOCK_FLOWS = [
  { id: "f1", name: "Price reply on comment", trigger: "Comment", runs: "1,284", status: "Live" },
  { id: "f2", name: "Welcome new followers", trigger: "DM", runs: "932", status: "Live" },
  { id: "f3", name: "Order status lookup", trigger: "Keyword", runs: "611", status: "Live" },
  { id: "f4", name: "Ramadan broadcast", trigger: "Broadcast", runs: "0", status: "Draft" },
  { id: "f5", name: "Lead capture to sheet", trigger: "Keyword", runs: "208", status: "Paused" },
  { id: "f6", name: "After-hours AI handoff", trigger: "AI", runs: "1,940", status: "Live" },
]

const MOCK_CONVERSATIONS = [
  {
    id: "conv-1",
    recipient_username: "sara_a",
    recipient_id: "sara_a",
    last_message_preview: "Is the black one back in stock?",
    last_message_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    platform: "instagram",
    unread_count: 2,
  },
  {
    id: "conv-2",
    recipient_username: "mohamed_k",
    recipient_id: "mohamed_k",
    last_message_preview: "تمام، هبعت العنوان دلوقتي",
    last_message_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    platform: "messenger",
    unread_count: 0,
  },
  {
    id: "conv-3",
    recipient_username: "lena_j",
    recipient_id: "lena_j",
    last_message_preview: "AI: Sent sizing guide",
    last_message_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    platform: "whatsapp",
    unread_count: 0,
  },
]

async function createMockedPage(context, isRtl = false) {
  const page = await context.newPage()

  await page.addInitScript(({ rtl }) => {
    localStorage.setItem("ig_account_id", "acc_demo")
    localStorage.setItem("ig_user_id", "usr_demo")
    localStorage.setItem("ig_username", "Workspace owner")
    localStorage.setItem("cyreax_session_account_id", "acc_demo")
    localStorage.setItem("cyreax_session_username", "Workspace owner")
    localStorage.setItem("cyreax_session_role", "admin")
    localStorage.setItem("cyreax_nav_open_parent", "automations")
    if (rtl) {
      document.documentElement.setAttribute("dir", "rtl")
      document.documentElement.setAttribute("lang", "ar")
    }
  }, { rtl: isRtl })

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
        role: "admin",
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
        usage: { messages_count: 8240, plan_limit: 10000 },
        plan: { id: "pro", name: "Pro" },
        status: "active",
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

  await page.route("**/api/automations*", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_FLOWS),
    })
  })

  await page.route("**/api/user/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connections: [] }),
    })
  })

  return page
}

async function run() {
  console.log("Starting menu system captures across 1440x900, 1024x768, and 390x844 (LTR & RTL)...")
  const browser = await chromium.launch({ headless: true })

  try {
    // 1. Desktop 1440x900 LTR: Flows screen with SidebarTree
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await createMockedPage(context, false)
      await page.goto("http://localhost:3000/dashboard/flows", { waitUntil: "networkidle" })
      await page.addStyleTag({
        content: `nextjs-portal, #nextjs-dev-tools, [data-nextjs-toast] { display: none !important; }`,
      })
      await page.waitForTimeout(500)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      console.log(`1440x900 LTR Overflow: ${overflow}`)

      await page.screenshot({ path: path.join(OUTPUT_DIR, "desktop_1440x900_flows_ltr.png") })
      console.log("Saved desktop_1440x900_flows_ltr.png")

      // Click Account Options to capture AccountMenu Popover
      const accountBtn = page.locator('button[aria-label="Account options"]').first()
      if (await accountBtn.isVisible()) {
        await accountBtn.click()
        await page.waitForTimeout(300)
        await page.screenshot({ path: path.join(OUTPUT_DIR, "desktop_1440x900_account_menu_ltr.png") })
        console.log("Saved desktop_1440x900_account_menu_ltr.png")
      }

      await context.close()
    }

    // 2. Desktop 1440x900 RTL: Flows screen with SidebarTree mirrored
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      const page = await createMockedPage(context, true)
      await page.goto("http://localhost:3000/dashboard/flows", { waitUntil: "networkidle" })
      await page.addStyleTag({
        content: `
          nextjs-portal, #nextjs-dev-tools, [data-nextjs-toast] { display: none !important; }
          html, body { direction: rtl !important; }
        `,
      })
      await page.evaluate(() => {
        document.documentElement.setAttribute("dir", "rtl")
        document.documentElement.setAttribute("lang", "ar")
      })
      await page.waitForTimeout(500)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      console.log(`1440x900 RTL Overflow: ${overflow}`)

      await page.screenshot({ path: path.join(OUTPUT_DIR, "desktop_1440x900_flows_rtl.png") })
      console.log("Saved desktop_1440x900_flows_rtl.png")

      await context.close()
    }

    // 3. Tablet 1024x768 (Desktop/Tablet boundary) & 800x600 (IconRail)
    {
      const context = await browser.newContext({ viewport: { width: 1024, height: 768 } })
      const page = await createMockedPage(context, false)
      await page.goto("http://localhost:3000/dashboard/flows", { waitUntil: "networkidle" })
      await page.addStyleTag({
        content: `nextjs-portal, #nextjs-dev-tools, [data-nextjs-toast] { display: none !important; }`,
      })
      await page.waitForTimeout(500)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      console.log(`1024x768 LTR Overflow: ${overflow}`)

      await page.screenshot({ path: path.join(OUTPUT_DIR, "desktop_1024x768_ltr.png") })
      console.log("Saved desktop_1024x768_ltr.png")

      await context.close()
    }

    // 3b. Tablet 800x600 with IconRail and flyout popover
    {
      const context = await browser.newContext({ viewport: { width: 800, height: 600 } })
      const page = await createMockedPage(context, false)
      await page.goto("http://localhost:3000/dashboard/flows", { waitUntil: "networkidle" })
      await page.addStyleTag({
        content: `nextjs-portal, #nextjs-dev-tools, [data-nextjs-toast] { display: none !important; }`,
      })
      await page.waitForTimeout(500)

      // Click parent in IconRail to open children popover
      const automationsBtn = page.locator('button[aria-label="Automations"]').first()
      if (await automationsBtn.isVisible()) {
        await automationsBtn.click()
        await page.waitForTimeout(300)
      }

      await page.screenshot({ path: path.join(OUTPUT_DIR, "tablet_800x600_iconrail_flyout.png") })
      console.log("Saved tablet_800x600_iconrail_flyout.png")

      await context.close()
    }

    // 4. Mobile 390x844 LTR: Inbox with TabBar & Context Menu
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const page = await createMockedPage(context, false)
      await page.goto("http://localhost:3000/dashboard/inbox", { waitUntil: "networkidle" })
      await page.addStyleTag({
        content: `nextjs-portal, #nextjs-dev-tools, [data-nextjs-toast] { display: none !important; }`,
      })
      await page.waitForTimeout(500)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      console.log(`390x844 LTR Overflow: ${overflow}`)

      await page.screenshot({ path: path.join(OUTPUT_DIR, "mobile_390x844_inbox_tabbar_ltr.png") })
      console.log("Saved mobile_390x844_inbox_tabbar_ltr.png")

      // Right-click on conversation to trigger Context Menu
      const firstRow = page.locator('div[role="button"]').first()
      if (await firstRow.isVisible()) {
        await firstRow.click({ button: "right" })
        await page.waitForTimeout(300)
        await page.screenshot({ path: path.join(OUTPUT_DIR, "context_menu_inbox_ltr.png") })
        console.log("Saved context_menu_inbox_ltr.png")
      }

      await context.close()
    }

    // 5. Mobile 390x844 RTL
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const page = await createMockedPage(context, true)
      await page.goto("http://localhost:3000/dashboard/inbox", { waitUntil: "networkidle" })
      await page.addStyleTag({
        content: `
          nextjs-portal, #nextjs-dev-tools, [data-nextjs-toast] { display: none !important; }
          html, body { direction: rtl !important; }
        `,
      })
      await page.evaluate(() => {
        document.documentElement.setAttribute("dir", "rtl")
        document.documentElement.setAttribute("lang", "ar")
      })
      await page.waitForTimeout(500)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
      console.log(`390x844 RTL Overflow: ${overflow}`)

      await page.screenshot({ path: path.join(OUTPUT_DIR, "mobile_390x844_inbox_tabbar_rtl.png") })
      console.log("Saved mobile_390x844_inbox_tabbar_rtl.png")

      await context.close()
    }

    // 6. Mobile 390x844 Drawer & More Slide Menu
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
      const page = await createMockedPage(context, false)
      await page.goto("http://localhost:3000/dashboard", { waitUntil: "networkidle" })
      await page.addStyleTag({
        content: `nextjs-portal, #nextjs-dev-tools, [data-nextjs-toast] { display: none !important; }`,
      })
      await page.waitForTimeout(500)

      // Open drawer
      const menuBtn = page.locator('button[aria-label="Open navigation drawer"]').first()
      if (await menuBtn.isVisible()) {
        await menuBtn.click()
        await page.waitForTimeout(300)
        await page.screenshot({ path: path.join(OUTPUT_DIR, "mobile_390x844_drawer_ltr.png") })
        console.log("Saved mobile_390x844_drawer_ltr.png")

        // Close drawer
        const closeBtn = page.locator('button[aria-label="Close navigation drawer"]').first()
        if (await closeBtn.isVisible()) await closeBtn.click()
        await page.waitForTimeout(300)
      }

      // Open More sheet (SlideMenu)
      const moreBtn = page.locator('button:has-text("More")').first()
      if (await moreBtn.isVisible()) {
        await moreBtn.click()
        await page.waitForTimeout(300)
        await page.screenshot({ path: path.join(OUTPUT_DIR, "mobile_390x844_more_sheet_ltr.png") })
        console.log("Saved mobile_390x844_more_sheet_ltr.png")

        // Click Security in SlideMenu
        const securityItem = page.locator('button:has-text("Security")').first()
        if (await securityItem.isVisible()) {
          await securityItem.click()
          await page.waitForTimeout(300)
          await page.screenshot({ path: path.join(OUTPUT_DIR, "mobile_390x844_slide_security_slidin.png") })
          console.log("Saved mobile_390x844_slide_security_slidin.png")
        }
      }

      await context.close()
    }

    console.log("All menu system captures completed successfully!")
  } catch (err) {
    console.error("Failed:", err)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
