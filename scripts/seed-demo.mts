/**
 * Sales-demo workspace. Does not run in CI.
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and
 * SEED_ACCOUNT_EMAIL for an account that already exists. Set SEED_KEEP_PLAN=1
 * to leave accounts.plan unchanged.
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

try {
  const envContent = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const index = trimmed.indexOf("=")
    if (index <= 0) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    if (!process.env[key]) process.env[key] = value
  }
} catch {
  // Environment may already be exported.
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.SEED_ACCOUNT_EMAIL

if (!url || !key || !email) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SEED_ACCOUNT_EMAIL. This script does not create a login.")
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  const account = await supabase.from("accounts").select("id, plan").eq("email", email).maybeSingle()
  if (account.error || !account.data?.id) {
    console.error(`No account found for ${email}. Create the login first, then re-run pnpm seed.`)
    process.exit(1)
  }
  const accountId = account.data.id as string
  if (process.env.SEED_KEEP_PLAN !== "1") {
    const updated = await supabase.from("accounts").update({ plan: "agency" }).eq("id", accountId)
    if (updated.error) console.error(updated.error.message)
  }

  let workspace = await supabase.from("workspaces").select("id").eq("owner_account_id", accountId).eq("name", "Helixa Demo Clinic").maybeSingle()
  if (!workspace.data?.id) {
    workspace = await supabase.from("workspaces").insert({ name: "Helixa Demo Clinic", owner_account_id: accountId }).select("id").maybeSingle()
  }
  if (workspace.error || !workspace.data?.id) {
    console.error(workspace.error?.message || "Could not create the demo workspace.")
    process.exit(1)
  }
  const workspaceId = workspace.data.id as string
  await supabase.from("workspace_members").upsert({ workspace_id: workspaceId, account_id: accountId, role: "owner" })

  let agency = await supabase.from("agencies").select("id").eq("owner_account_id", accountId).eq("name", "Noir Agency").maybeSingle()
  if (!agency.data?.id) {
    agency = await supabase.from("agencies").insert({
      owner_account_id: accountId,
      name: "Noir Agency",
      app_name: "Noir",
    }).select("id").maybeSingle()
  }
  if (agency.data?.id) {
    await supabase.from("workspaces").update({ agency_id: agency.data.id }).eq("id", workspaceId)
  }

  let profile = await supabase.from("users").select("id").eq("account_id", accountId).limit(1).maybeSingle()
  if (!profile.data?.id) {
    profile = await supabase.from("users").insert({
      id: 900000001,
      username: "helixa_demo",
      account_id: accountId,
      access_token: "workspace_managed",
      plan: "agency",
    }).select("id").maybeSingle()
  }
  if (!profile.data?.id) {
    console.error(profile.error?.message || "Could not attach a channel profile. Contacts were skipped.")
    process.exit(1)
  }
  const userId = profile.data.id

  const contacts = [
    { channel: "instagram", external_id: "demo-sara-adel", display_name: "Sara Adel", username: "sara.adel" },
    { channel: "whatsapp", external_id: "demo-omar-khaled", display_name: "عمر خالد", phone: "+966500000000" },
  ]
  for (const contact of contacts) {
    const saved = await supabase.from("contacts").upsert({
      ...contact,
      workspace_id: workspaceId,
      user_id: userId,
      source: "seed",
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "user_id,channel,external_id" })
    if (saved.error) console.error(saved.error.message)
  }

  if (agency.data?.id) {
    const price = await supabase.from("client_workspace_prices").upsert({
      agency_id: agency.data.id,
      workspace_id: workspaceId,
      amount_cents: 4900,
      currency: "sar",
      interval: "month",
      provider: "tap",
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id" })
    if (price.error) console.error(price.error.message)
  }

  console.log(`Demo ready. Workspace ${workspaceId} on ${email}. Client price 49.00 SAR / month via Tap.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
