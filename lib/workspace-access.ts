/**
 * Workspace roles. Rank increases with authority.
 * client-viewer can read. member can change automations and the inbox.
 * admin can connect channels and manage members. owner can also bill and delete.
 */

export const WORKSPACE_ROLES = ["client-viewer", "member", "admin", "owner"] as const

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export const WORKSPACE_COOKIE = "helixa_workspace"

const RANK: Record<WorkspaceRole, number> = {
  "client-viewer": 0,
  member: 1,
  admin: 2,
  owner: 3,
}

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === "string" && (WORKSPACE_ROLES as readonly string[]).includes(value)
}

export function roleRank(role: WorkspaceRole): number {
  return RANK[role]
}

export function roleAllows(role: WorkspaceRole, minimum: WorkspaceRole): boolean {
  return RANK[role] >= RANK[minimum]
}

export function minimumRoleForMethod(method: string): WorkspaceRole {
  return WRITE_METHODS.has(method.toUpperCase()) ? "member" : "client-viewer"
}

/**
 * Server-side gate used by every workspace API route.
 * `minimum` overrides the method default (channel connect asks for admin,
 * billing asks for owner).
 */
export function authorizeWorkspaceAction(input: {
  role: WorkspaceRole | null | undefined
  method?: string
  minimum?: WorkspaceRole
}): "ok" | "forbidden" {
  const minimum = input.minimum ?? (input.method ? minimumRoleForMethod(input.method) : "client-viewer")
  if (!input.role || !roleAllows(input.role, minimum)) return "forbidden"
  return "ok"
}

export interface WorkspaceChoice {
  workspaceId: string
  role: WorkspaceRole
  createdAt?: string | null
}

/**
 * Which workspace this request operates on.
 * An explicit id the caller is not a member of is refused by the caller
 * (see `workspaceChoiceDenied`). Otherwise the saved active workspace wins.
 * An owned workspace beats an invited one, so someone in several agencies
 * is not stuck on the oldest membership.
 */
export function pickWorkspace<T extends WorkspaceChoice>(
  memberships: T[],
  options: { requestedId?: string | null; activeId?: string | null },
): T | null {
  if (memberships.length === 0) return null
  const requested = options.requestedId
    ? memberships.find((membership) => membership.workspaceId === options.requestedId)
    : undefined
  if (requested) return requested
  const active = options.activeId
    ? memberships.find((membership) => membership.workspaceId === options.activeId)
    : undefined
  if (active) return active

  const owned = memberships.filter((membership) => membership.role === "owner")
  const pool = owned.length > 0 ? owned : memberships
  return [...pool].sort((a, b) => {
    const at = a.createdAt ? Date.parse(a.createdAt) : 0
    const bt = b.createdAt ? Date.parse(b.createdAt) : 0
    if (at !== bt) return at - bt
    return a.workspaceId.localeCompare(b.workspaceId)
  })[0]
}

export function workspaceChoiceDenied(
  memberships: WorkspaceChoice[],
  requestedId: string | null | undefined,
): boolean {
  if (!requestedId) return false
  return !memberships.some((membership) => membership.workspaceId === requestedId)
}

/** Map the previous agency seat names onto workspace roles. */
export function workspaceRoleFromLegacy(level: string | null | undefined): WorkspaceRole {
  switch ((level || "").toLowerCase().replace(/_/g, "-")) {
    case "owner":
      return "owner"
    case "admin":
      return "admin"
    case "editor":
    case "member":
      return "member"
    case "viewer":
    case "client-viewer":
      return "client-viewer"
    default:
      return "member"
  }
}

/** Values the existing automation and team checks already understand. */
export function legacyPermissionLevel(role: WorkspaceRole): "viewer" | "editor" | "admin" {
  if (role === "client-viewer") return "viewer"
  if (role === "member") return "editor"
  return "admin"
}
