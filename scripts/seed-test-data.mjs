import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

// Simple env file parser
try {
  const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      process.env[key] = val
    }
  }
} catch (e) {
  console.log("No .env.local found or error reading it:", e.message)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment!")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function seed() {
  console.log("🌱 Starting realistic test data seeding...")

  // 1. Fetch existing users & accounts
  const { data: users, error: userError } = await supabase.from("users").select("*").limit(10)
  if (userError) {
    console.error("Error fetching users:", userError)
  }
  console.log(`Found ${users?.length || 0} user rows in users table.`)

  let mainUser = users?.[0]
  if (!mainUser) {
    console.log("Creating default user and account...")
    const { data: newAccount, error: accErr } = await supabase
      .from("accounts")
      .insert({
        email: "demo@helixa.app",
        full_name: "Demo Account",
        role: "admin",
        plan: "monthly",
        trial_exempt: true,
      })
      .select()
      .single()

    if (accErr) console.error("Account insert error:", accErr)

    const { data: newUser, error: uErr } = await supabase
      .from("users")
      .insert({
        id: 10001,
        username: "helixa_demo",
        account_id: newAccount?.id,
        business_account_id: "fb_page_demo_101",
        page_id: "fb_page_demo_101",
        access_token: "demo_access_token_mock",
        plan: "monthly",
        role: "admin",
      })
      .select()
      .single()

    if (uErr) console.error("User insert error:", uErr)
    mainUser = newUser
  }

  const userId = mainUser.id

  // 2. Ensure test platform connections exist
  console.log("🔗 Ensuring platform_connections exist for Facebook, Messenger, and Telegram...")
  const connections = [
    {
      user_id: userId,
      platform: "facebook",
      page_id: "fb_page_demo_101",
      external_account_id: "fb_page_demo_101",
      access_token: "mock_fb_page_token",
      metadata: { name: "Helixa Demo Facebook Page", category: "Software" },
    },
    {
      user_id: userId,
      platform: "messenger",
      page_id: "fb_page_demo_101",
      external_account_id: "fb_page_demo_101",
      access_token: "mock_fb_page_token",
      metadata: { name: "Helixa Messenger Bot", category: "Support" },
    },
    {
      user_id: userId,
      platform: "telegram",
      page_id: "123456789",
      external_account_id: "123456789",
      access_token: "mock_telegram_bot_token",
      metadata: { username: "helixa_demo_bot", title: "Helixa Telegram Assistant" },
    },
  ]

  for (const conn of connections) {
    const { data: existing } = await supabase
      .from("platform_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", conn.platform)
      .maybeSingle()

    if (!existing) {
      const { error } = await supabase.from("platform_connections").insert(conn)
      if (error) console.warn(`Could not insert ${conn.platform} connection:`, error.message)
      else console.log(`✅ Inserted ${conn.platform} connection.`)
    }
  }

  // 3. Create realistic test automations across all platforms
  console.log("⚡ Creating real test automations across Instagram, Facebook, and Telegram...")
  const testAutomations = [
    // Instagram Automations
    {
      user_id: userId,
      name: "IG Promo Keyword -> VIP Link",
      platform: "instagram",
      trigger_source: "comment",
      trigger_type: "keyword",
      trigger_value: "vip,link,access,promo",
      is_active: true,
      response_content: {
        message: "Hey there! Thanks for your comment. Here is your exclusive VIP access link: https://helixa.app/vip 🔥",
        reply_mode: "both",
        public_replies: ["Check your DMs! 📥", "Sent you the VIP link! ✨", "Check inbox! 🔥"],
        delay_seconds: 1,
        typing_indicator: true,
      },
    },
    {
      user_id: userId,
      name: "IG DM Keyword -> Product Showcase",
      platform: "instagram",
      trigger_source: "dm",
      trigger_type: "keyword",
      trigger_value: "price,pricing,plans",
      is_active: true,
      response_content: {
        message: "Here are our current pricing tiers:",
        card: {
          title: "Helixa Pro Suite",
          subtitle: "Automate DMs, Comments, and Leads on Autopilot for $9.99/mo",
          buttons: [
            { type: "web_url", title: "View Plans", url: "https://helixa.app/pricing" },
            { type: "postback", title: "Start Free Trial", payload: "START_TRIAL" },
          ],
        },
        delay_seconds: 2,
        typing_indicator: true,
      },
    },
    // Facebook Automations
    {
      user_id: userId,
      name: "FB Page Post Keyword -> Private DM Reply",
      platform: "facebook",
      trigger_source: "comment",
      trigger_type: "keyword",
      trigger_value: "help,info,details,guide",
      is_active: true,
      response_content: {
        message: "Thanks for reaching out on our Facebook Page! We have sent the complete guide to your inbox.",
        reply_mode: "both",
        public_replies: ["Sent you the guide via Messenger! 📥", "Check your inbox for full details! ✨"],
        delay_seconds: 1,
        typing_indicator: true,
      },
    },
    {
      user_id: userId,
      name: "Messenger DM -> Instant Support Bot",
      platform: "facebook",
      trigger_source: "dm",
      trigger_type: "keyword",
      trigger_value: "start,hello,hi,hey",
      is_active: true,
      response_content: {
        message: "Welcome to Helixa Support! How can we assist you today?",
        quick_replies: [
          { title: "Pricing & Plans", payload: "QR_PRICING" },
          { title: "Features", payload: "QR_FEATURES" },
          { title: "Talk to Human", payload: "QR_HUMAN" },
        ],
        delay_seconds: 1,
        typing_indicator: true,
      },
    },
    // Telegram Automations
    {
      user_id: userId,
      name: "Telegram Bot /start -> Interactive Menu",
      platform: "telegram",
      trigger_source: "dm",
      trigger_type: "keyword",
      trigger_value: "/start,start,menu",
      is_active: true,
      response_content: {
        message: "🚀 Welcome to Helixa Telegram Assistant!\n\nSelect an option below to get started immediately:",
        card: {
          title: "Helixa AI Automation",
          subtitle: "Connect your social channels & convert leads 24/7",
          buttons: [
            { type: "web_url", title: "Visit Dashboard", url: "https://helixa.app/dashboard" },
            { type: "postback", title: "Support Docs", payload: "DOCS" },
          ],
        },
        delay_seconds: 1,
        typing_indicator: true,
      },
    },
    {
      user_id: userId,
      name: "Telegram Keyword -> Instant Resource Drop",
      platform: "telegram",
      trigger_source: "dm",
      trigger_type: "keyword",
      trigger_value: "download,pdf,cheat sheet,resource",
      is_active: true,
      response_content: {
        message: "Here is the free 2026 Growth Playbook PDF: https://helixa.app/downloads/growth-playbook.pdf 📈",
        delay_seconds: 1,
        typing_indicator: true,
      },
    },
  ]

  for (const auto of testAutomations) {
    const { data: existingAuto } = await supabase
      .from("automations")
      .select("id")
      .eq("user_id", userId)
      .eq("name", auto.name)
      .maybeSingle()

    if (!existingAuto) {
      const { data: inserted, error } = await supabase.from("automations").insert(auto).select().single()
      if (error) console.warn("Error inserting automation:", error.message)
      else console.log(`✅ Created automation: "${auto.name}" [${auto.platform}]`)
    }
  }

  // 4. Seed realistic automation_events for charts & analytics
  console.log("📊 Seeding realistic automation_events across platforms...")
  const platforms = ["instagram", "facebook", "telegram"]

  const sampleEvents = []
  for (let i = 0; i < 30; i++) {
    const platform = platforms[i % platforms.length]
    const daysAgo = Math.floor(Math.random() * 7)
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 3600000).toISOString()

    sampleEvents.push({
      user_id: userId,
      platform,
      event_type: "sent",
      created_at: createdAt,
    })
  }

  const { error: eventErr } = await supabase.from("automation_events").insert(sampleEvents)
  if (eventErr) console.warn("Events seeding warning:", eventErr.message)
  else console.log(`✅ Seeded ${sampleEvents.length} automation events.`)

  // 5. Seed test customer accounts for campaign audience preview
  console.log("👥 Seeding sample customer accounts and newsletter subscribers...")
  const sampleAccounts = [
    { email: "sarah.growth@example.com", full_name: "Sarah Jenkins", role: "customer", plan: "trial" },
    { email: "alex.marketing@example.com", full_name: "Alex Rivera", role: "customer", plan: "monthly" },
    { email: "david.agency@example.com", full_name: "David Kim", role: "customer", plan: "one_time" },
    { email: "elena.creator@example.com", full_name: "Elena Rostova", role: "customer", plan: "expired" },
    { email: "marcus.saas@example.com", full_name: "Marcus Vance", role: "customer", plan: "monthly" },
    { email: "chloe.ecommerce@example.com", full_name: "Chloe Dupont", role: "customer", plan: "trial" },
  ]

  for (const acc of sampleAccounts) {
    const { data: existing } = await supabase.from("accounts").select("id").eq("email", acc.email).maybeSingle()
    if (!existing) {
      const { error } = await supabase.from("accounts").insert(acc)
      if (error) console.warn("Error inserting account:", error.message)
      else console.log(`✅ Seeded account: ${acc.email} (${acc.plan})`)
    }
  }

  const sampleSubscribers = [
    { email: "subscriber1@example.com" },
    { email: "subscriber2@example.com" },
    { email: "subscriber3@example.com" },
  ]

  for (const sub of sampleSubscribers) {
    const { data: existingSub } = await supabase.from("newsletter_subscribers").select("id").eq("email", sub.email).maybeSingle()
    if (!existingSub) {
      const { error } = await supabase.from("newsletter_subscribers").insert(sub)
      if (error) console.warn("Newsletter subscriber insert:", error.message)
      else console.log(`✅ Seeded newsletter subscriber: ${sub.email}`)
    }
  }

  // 6. Seed sample email campaigns
  console.log("📧 Seeding sample email campaigns...")
  const sampleCampaigns = [
    {
      name: "August Feature Drop & Roadmap",
      subject: "Exciting new AI Automations inside Helixa",
      preview_text: "Discover multi-platform automation on Facebook & Telegram",
      template: "minimal",
      status: "completed",
      audience_filter: "all",
      recipient_count: 5,
      heading: "New Multi-Platform Automations Are Live",
      subheading: "Connect Facebook Pages and Telegram Bots in seconds.",
      body_text: "We're excited to roll out complete automation support for Facebook and Telegram alongside Instagram. Now you can capture leads, reply to comments, and guide customers across every channel.",
      cta_text: "Explore New Features",
      cta_url: "https://helixa.app/dashboard",
      sent_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      name: "Special Pro Upgrade Offer",
      subject: "Unlock Unlimited Automations at 20% Off",
      preview_text: "Upgrade your trial today and lock in our founding member rate",
      template: "bold",
      status: "draft",
      audience_filter: "trial",
      recipient_count: 0,
      heading: "Supercharge Your Social Growth",
      subheading: "Upgrade to Helixa Pro today.",
      body_text: "Your free trial gives you a taste of autopilot engagement. Upgrade now to unlock unlimited keyword triggers, A/B testing variants, and full analytics.",
      cta_text: "Claim 20% Discount",
      cta_url: "https://helixa.app/pricing",
    },
  ]

  for (const camp of sampleCampaigns) {
    const { data: existingCamp } = await supabase.from("email_campaigns").select("id").eq("name", camp.name).maybeSingle()
    if (!existingCamp) {
      const { error } = await supabase.from("email_campaigns").insert(camp)
      if (error) console.warn("Campaign insert error:", error.message)
      else console.log(`✅ Seeded campaign: "${camp.name}" (${camp.status})`)
    }
  }

  console.log("✨ Test data seeding completed successfully!")
}

seed().catch(console.error)
