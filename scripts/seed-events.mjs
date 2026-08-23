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

async function seedEvents() {
  const { data: users } = await supabase.from("users").select("id")
  const userIds = users.map(u => u.id)

  const platforms = ["instagram", "facebook", "messenger"]
  const sampleEvents = []

  for (const userId of userIds) {
    for (let i = 0; i < 20; i++) {
      const platform = platforms[i % platforms.length]
      const daysAgo = Math.floor(Math.random() * 10)
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 3600000).toISOString()

      sampleEvents.push({
        user_id: userId,
        platform,
        event_type: "sent",
        created_at: createdAt,
      })
    }
  }

  const { data, error } = await supabase.from("automation_events").insert(sampleEvents).select()
  if (error) {
    console.error("Error inserting events:", error)
  } else {
    console.log(`✅ Successfully seeded ${data?.length || 0} automation events!`)
  }
}

seedEvents().catch(console.error)
