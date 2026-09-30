"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/lib/i18n/LanguageContext"

interface WorkspaceOption {
  id: string
  name: string
  role: string
}

/**
 * Picks the client workspace for this browser. The choice is stored in an
 * httpOnly cookie and on the account, so the next request is scoped to that
 * workspace instead of the oldest team seat.
 */
export function WorkspaceSwitcher() {
  const { t } = useLanguage()
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([])
  const [activeId, setActiveId] = useState<string>("")
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/workspaces", { credentials: "same-origin", cache: "no-store" })
        const data = await res.json()
        if (!res.ok || cancelled) return
        const list: WorkspaceOption[] = data.workspaces || []
        setMigrationRequired(Boolean(data.migrationRequired))
        setWorkspaces(list)
        const current = list.find((workspace) => workspace.id === data.activeWorkspaceId) || list[0]
        if (current) setActiveId(current.id)
      } catch {
        // The switcher stays hidden when the request fails.
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded || migrationRequired) return null

  if (workspaces.length === 0 && !open) {
    return (
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full text-left text-[11px] text-neutral-500 hover:text-neutral-200 px-2 py-1"
        >
          {t.newWorkspace}
        </button>
      </div>
    )
  }

  async function switchTo(workspaceId: string) {
    if (!workspaceId || workspaceId === activeId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not switch workspace")
        setBusy(false)
        return
      }
      try {
        localStorage.removeItem("ig_user_id")
      } catch {
        // non-fatal
      }
      window.location.assign("/dashboard")
    } catch {
      setError("Could not switch workspace")
      setBusy(false)
    }
  }

  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Could not create workspace")
        setBusy(false)
        return
      }
      try {
        localStorage.removeItem("ig_user_id")
      } catch {
        // non-fatal
      }
      window.location.assign("/dashboard")
    } catch {
      setError("Could not create workspace")
      setBusy(false)
    }
  }

  const active = workspaces.find((workspace) => workspace.id === activeId)

  return (
    <div className="px-3 pb-3">
      <label className="px-1 font-mono-ui text-[9px] uppercase tracking-widest text-neutral-600">
        {t.workspace}
      </label>
      {workspaces.length > 0 && (
        <select
          value={activeId}
          disabled={busy}
          onChange={(event) => switchTo(event.target.value)}
          className="mt-1 w-full bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-[12px] text-white focus:outline-none [&>option]:bg-[#0b0b10] [&>option]:text-white"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name} · {workspace.role}
            </option>
          ))}
        </select>
      )}
      {active && (
        <p className="px-1 pt-1 text-[10px] text-neutral-500 truncate">{active.role}</p>
      )}
      {open ? (
        <form onSubmit={create} className="mt-2 flex gap-1">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.workspaceName}
            className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[12px] text-white placeholder:text-neutral-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="shrink-0 rounded-md bg-[#e5a93c] px-2 py-1 text-[11px] font-semibold text-black disabled:opacity-50"
          >
            {t.createWorkspace}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1 px-1 text-[11px] text-neutral-500 hover:text-neutral-200"
        >
          {t.newWorkspace}
        </button>
      )}
      {error && <p className="px-1 pt-1 text-[10px] text-red-400">{error}</p>}
    </div>
  )
}
