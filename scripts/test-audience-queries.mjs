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

async function testCustomerAudienceQueries() {
  console.log("Testing audience filter queries...")

  const filters = ["all", "paid", "monthly", "expired", "newsletter"]

  for (const filter of filters) {
    if (filter === "newsletter") {
      const { data } = await supabase.from("newsletter_subscribers").select("id, email")
      console.log(`Filter "${filter}": ${data?.length || 0} matching recipients`)
    } else {
      let query = supabase.from("accounts").select("id, email, full_name, role, plan").neq("role", "admin")
      if (filter === "monthly") query = query.eq("plan", "monthly")
      else if (filter === "expired") query = query.eq("plan", "expired")
      else if (filter === "paid") query = query.in("plan", ["monthly", "one_time"])

      const { data } = await query
      console.log(`Filter "${filter}": ${data?.length || 0} matching accounts:`, data?.map(d => `${d.email} (${d.plan})`))
    }
  }
}

testCustomerAudienceQueries().catch(console.error)
