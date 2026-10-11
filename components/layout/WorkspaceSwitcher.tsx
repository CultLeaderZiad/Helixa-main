"use client"

import { useEffect, useState, useRef } from "react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { ChevronsUpDown, Check, Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [migrationRequired, setMigrationRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  if (!loaded || migrationRequired) return null

  const active = workspaces.find((workspace) => workspace.id === activeId) || {
    id: "personal",
    name: "Workspace",
    role: "Owner",
  }

  const initial = (active.name || "W").charAt(0).toUpperCase()

  async function switchTo(workspaceId: string) {
    if (!workspaceId || workspaceId === activeId) {
      setOpen(false)
      return
    }
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

  return (
    <div className="relative px-3 pb-3" ref={dropdownRef}>
      {/* Switcher trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "w-full flex items-center justify-between gap-2 p-2 rounded-[8px] bg-[var(--s2)] border border-[var(--line2)] hover:border-[var(--line3)] transition-colors text-start outline-none focus-visible:outline-2 focus-visible:outline-[var(--t1)] focus-visible:outline-offset-1 cursor-pointer",
          busy && "opacity-60 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded-[6px] bg-[var(--goldbg)] border border-[var(--goldline)] flex items-center justify-center shrink-0">
            <span className="text-[12px] font-bold text-[var(--gold2)] leading-none">{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-[var(--t1)] truncate leading-none">
              {active.name}
            </p>
            <p className="text-[10.5px] text-[var(--t3)] truncate leading-none mt-1">
              {active.role}
            </p>
          </div>
        </div>
        <ChevronsUpDown className="size-3.5 text-[var(--t3)] shrink-0" />
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div className="absolute start-3 end-3 top-full mt-1.5 z-50 rounded-[8px] bg-[var(--s1)] border border-[var(--line2)] shadow-xl p-1.5 space-y-1">
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {workspaces.map((ws) => {
              const selected = ws.id === activeId
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => switchTo(ws.id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[6px] text-start transition-colors text-[12px] cursor-pointer",
                    selected
                      ? "bg-[var(--s3)] text-[var(--t1)] font-medium"
                      : "text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--s2)]"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate leading-tight">{ws.name}</p>
                    <p className="text-[10px] text-[var(--t3)] truncate leading-tight">{ws.role}</p>
                  </div>
                  {selected && <Check className="size-3 text-[var(--gold)] shrink-0" />}
                </button>
              )
            })}
          </div>

          <div className="border-t border-[var(--line)] pt-1.5 mt-1">
            {isCreating ? (
              <form onSubmit={create} className="space-y-1.5 p-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.workspaceName || "Workspace name"}
                  autoFocus
                  className="w-full h-[28px] px-2 text-[12px] rounded-[4px] bg-[var(--s2)] border border-[var(--line2)] text-[var(--t1)] placeholder:text-[var(--t3)] outline-none focus:border-[var(--line3)]"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    disabled={busy || !name.trim()}
                    className="h-[24px] px-2 text-[11px] font-medium rounded-[4px] bg-[var(--t1)] text-[#0B0B0D] hover:bg-white transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {busy ? <Loader2 className="size-3 animate-spin" /> : (t.createWorkspace || "Create")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false)
                      setName("")
                    }}
                    className="h-[24px] px-2 text-[11px] rounded-[4px] text-[var(--t3)] hover:text-[var(--t1)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[11.5px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s2)] transition-colors cursor-pointer"
              >
                <Plus className="size-3" />
                <span>{t.newWorkspace || "New workspace"}</span>
              </button>
            )}
          </div>

          {error && (
            <p className="px-2 py-1 text-[10.5px] text-[var(--red)]">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
