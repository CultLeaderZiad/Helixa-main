import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

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

async function check() {
  console.log("Checking DB schema...")

  const { data: accounts, error: aErr } = await supabase.from("accounts").select("*").limit(2)
  console.log("Accounts sample:", accounts, "Err:", aErr)

  const { data: events, error: eErr } = await supabase.from("automation_events").select("*").limit(2)
  console.log("Automation events sample:", events, "Err:", eErr)

  const { data: automations, error: autoErr } = await supabase.from("automations").select("*").limit(2)
  console.log("Automations sample:", automations, "Err:", autoErr)

  const { data: campaigns, error: cErr } = await supabase.from("email_campaigns").select("*").limit(2)
  console.log("Campaigns sample:", campaigns, "Err:", cErr)
}

check().catch(console.error)
