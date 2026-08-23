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

async function testEvents() {
  const { data: users } = await supabase.from("users").select("id").limit(1)
  const userId = users[0].id

  const testEvent = {
    user_id: userId,
    event_type: "comment_dm",
    platform: "facebook",
  }

  const { data, error } = await supabase.from("automation_events").insert(testEvent).select()
  console.log("Insert event result:", data, "Error:", error)
}

testEvents().catch(console.error)
