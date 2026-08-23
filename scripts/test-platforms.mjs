import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"
import crypto from "crypto"

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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function testPlatforms() {
  const { data: users } = await supabase.from("users").select("id").limit(1)
  const userId = users[0].id

  const platforms = ["instagram", "facebook", "messenger", "whatsapp", "telegram"]

  for (const p of platforms) {
    const { data, error } = await supabase.from("automation_events").insert({
      user_id: userId,
      event_type: "sent",
      platform: p
    }).select()

    if (!error) {
      console.log(`✅ Allowed platform in automation_events: "${p}"`)
    } else {
      console.log(`❌ Rejected platform "${p}":`, error.message)
    }
  }

  // Test account insert with randomUUID
  const testAcc = {
    id: crypto.randomUUID(),
    email: `test_${Date.now()}@example.com`,
    full_name: "Test User",
    role: "customer",
    plan: "trial"
  }
  const { data: accData, error: accErr } = await supabase.from("accounts").insert(testAcc).select()
  console.log("Account insert test:", accData, "Err:", accErr)
}

testPlatforms().catch(console.error)
