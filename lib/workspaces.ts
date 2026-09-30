import { randomProfileId, placeholderUsername, type TenantProfile } from "@/lib/tenant-user"
import {
  isWorkspaceRole,
  workspaceRoleFromLegacy,
  type WorkspaceRole,
} from "@/lib/workspace-access"

export interface WorkspaceMembership {
  workspaceId: string
  name: string
  role: WorkspaceRole
  ownerAccountId: string
  createdAt: string | null
}

function missingRelation(error: { message?: string; code?: string } | null | undefined): boolean {
  const message = error?.message || ""
  return error?.code === "42P01" || error?.code === "PGRST205" || /schema cache|does not exist|Could not find the table|workspace_members|relation/i.test(message)
}

export async function listMemberships(supabase: any, accountId: string): Promise<WorkspaceMembership[] | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, created_at, workspaces(id, name, owner_account_id, created_at)")
    .eq("account_id", accountId)

  if (error) {
    if (missingRelation(error)) return null
    // Embedded select can fail if the relationship isn't in the cache yet.
    const plain = await supabase
      .from("workspace_members")
      .select("workspace_id, role, created_at")
      .eq("account_id", accountId)
    if (plain.error) {
      if (missingRelation(plain.error)) return null
      throw plain.error
    }
    const ids = (plain.data || []).map((row: any) => row.workspace_id)
    if (ids.length === 0) return []
    const workspaces = await supabase
      .from("workspaces")
      .select("id, name, owner_account_id, created_at")
      .in("id", ids)
    if (workspaces.error) throw workspaces.error
    const byId = new Map((workspaces.data || []).map((row: any) => [row.id, row]))
    return (plain.data || [])
      .map((row: any) => toMembership(row, byId.get(row.workspace_id)))
      .filter((row: WorkspaceMembership | null): row is WorkspaceMembership => Boolean(row))
  }

  return (data || [])
    .map((row: any) => toMembership(row, row.workspaces))
    .filter((row: WorkspaceMembership | null): row is WorkspaceMembership => Boolean(row))
}

function toMembership(row: any, workspace: any): WorkspaceMembership | null {
  const nested = Array.isArray(workspace) ? workspace[0] : workspace
  if (!nested?.id || !isWorkspaceRole(row.role)) return null
  return {
    workspaceId: nested.id,
    name: nested.name || "Workspace",
    role: row.role,
    ownerAccountId: nested.owner_account_id,
    createdAt: nested.created_at || row.created_at || null,
  }
}

export function workspaceNameFromAccount(account: { email?: string | null; id: string }): string {
  const local = account.email?.split("@")[0]?.trim()
  return local || "Workspace"
}

/**
 * One default workspace per account that does not have one yet.
 * Existing profile rows are tagged onto it so current automations, channels,
 * and conversations stay put. Returns null when the phase 2 tables are not
 * installed yet.
 */
export async function ensureDefaultWorkspace(
  supabase: any,
  account: { id: string; email?: string | null },
): Promise<WorkspaceMembership | null> {
  const existing = await listMemberships(supabase, account.id)
  if (existing === null) return null
  const owned = existing.find((membership) => membership.role === "owner" && membership.ownerAccountId === account.id)
  if (owned) return owned

  const { data: created, error } = await supabase
    .from("workspaces")
    .insert({
      name: workspaceNameFromAccount(account),
      owner_account_id: account.id,
    })
    .select("id, name, owner_account_id, created_at")
    .single()
  if (error) {
    if (missingRelation(error)) return null
    throw error
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: created.id,
    account_id: account.id,
    role: "owner",
  })
  if (memberError && memberError.code !== "23505") {
    if (!missingRelation(memberError)) throw memberError
  }

  await supabase.from("accounts").update({ active_workspace_id: created.id }).eq("id", account.id).is("active_workspace_id", null)

  const tag = await supabase.from("users").update({ workspace_id: created.id }).eq("account_id", account.id).is("workspace_id", null)
  if (tag.error && !/workspace_id/i.test(tag.error.message || "")) {
    console.warn("[workspaces] Could not tag existing profiles:", tag.error.message)
  }

  return {
    workspaceId: created.id,
    name: created.name,
    role: "owner",
    ownerAccountId: account.id,
    createdAt: created.created_at,
  }
}

export async function createWorkspace(
  supabase: any,
  account: { id: string; email?: string | null },
  name: string,
): Promise<WorkspaceMembership> {
  const trimmed = name.trim().slice(0, 80)
  if (!trimmed) throw new Error("Workspace name is required")

  const { data: created, error } = await supabase
    .from("workspaces")
    .insert({ name: trimmed, owner_account_id: account.id })
    .select("id, name, owner_account_id, created_at")
    .single()
  if (error) throw error

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: created.id,
    account_id: account.id,
    role: "owner",
  })
  if (memberError) throw memberError

  await ensureWorkspaceProfile(supabase, account, created.id, "workspace_managed")
  await supabase.from("accounts").update({ active_workspace_id: created.id }).eq("id", account.id)

  return {
    workspaceId: created.id,
    name: created.name,
    role: "owner",
    ownerAccountId: account.id,
    createdAt: created.created_at,
  }
}

export async function ensureWorkspaceProfile(
  supabase: any,
  account: { id: string; email?: string | null },
  workspaceId: string,
  placeholderToken: "facebook_managed" | "telegram_managed" | "workspace_managed",
): Promise<TenantProfile> {
  const { data: existing, error: readError } = await supabase
    .from("users")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(1)
  if (readError) {
    if (/workspace_id/i.test(readError.message || "")) {
      throw new Error("workspaces are not installed yet")
    }
    throw readError
  }
  if (existing?.[0]) return existing[0]

  let lastError: { message?: string; code?: string } | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = randomProfileId()
    const { data, error } = await supabase
      .from("users")
      .insert({
        id,
        account_id: account.id,
        workspace_id: workspaceId,
        username: placeholderUsername(account, attempt),
        access_token: placeholderToken,
      })
      .select("*")
      .maybeSingle()
    if (!error && data) return data
    lastError = error
    if (error?.code !== "23505") break
  }
  throw new Error(lastError?.message || "Could not create a profile for this workspace")
}

export async function addWorkspaceMember(
  supabase: any,
  workspaceId: string,
  accountId: string,
  role: WorkspaceRole,
): Promise<void> {
  if (role === "owner") return
  const { data: existing } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("account_id", accountId)
    .maybeSingle()
  if (existing?.role === "owner") return
  if (existing) {
    await supabase
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("account_id", accountId)
    return
  }
  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    account_id: accountId,
    role,
  })
  if (error && error.code !== "23505") throw error
}

export { workspaceRoleFromLegacy }
