"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Users, TrendingUp, AlertTriangle, Shield, RefreshCw,
  Search, ChevronLeft, ChevronRight, X, Check,
  Activity, DollarSign, Clock, Flag
} from "lucide-react"

interface Stats {
  totalUsers: number
  activeTrials: number
  monthlyUsers: number
  oneTimeUsers: number
  expiredUsers: number
  flaggedUsers: number
  automationsToday: number
}

interface User {
  id: number
  username: string
  role: string
  plan: string
  trial_ends_at: string | null
  is_flagged: boolean
  flagged_reason: string | null
  signup_ip: string | null
  created_at: string
}

interface AuditLog {
  id: string
  action: string
  details: any
  created_at: string
  admin: { id: number; username: string } | null
  target: { id: number; username: string } | null
}

const PLAN_COLORS: Record<string, string> = {
  trial: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  monthly: "text-green-400 bg-green-400/10 border-green-400/20",
  one_time: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  expired: "text-red-400 bg-red-400/10 border-red-400/20",
}

const ROLE_COLORS: Record<string, string> = {
  admin: "text-[#ffe14d] bg-[#ffe14d]/10 border-[#ffe14d]/20",
  user: "text-neutral-400 bg-neutral-400/10 border-neutral-400/20",
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [search, setSearch] = useState("")
  const [filterPlan, setFilterPlan] = useState("")
  const [filterFlagged, setFilterFlagged] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users")

  // Edit state
  const [editPlan, setEditPlan] = useState("")
  const [editRole, setEditRole] = useState("")
  const [editFlagged, setEditFlagged] = useState(false)
  const [editFlaggedReason, setEditFlaggedReason] = useState("")

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats")
    const data = await res.json()
    if (data.stats) setStats(data.stats)
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (search) params.set("search", search)
    if (filterPlan) params.set("plan", filterPlan)
    if (filterFlagged) params.set("is_flagged", filterFlagged)

    const res = await fetch(`/api/admin/users?${params}`)
    const data = await res.json()
    if (data.users) {
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
    }
    setLoading(false)
  }, [page, search, filterPlan, filterFlagged])

  const fetchAuditLogs = useCallback(async () => {
    const res = await fetch("/api/admin/audit-log?limit=30")
    const data = await res.json()
    if (data.logs) setAuditLogs(data.logs)
  }, [])

  useEffect(() => {
    fetchStats()
    fetchAuditLogs()
  }, [fetchStats, fetchAuditLogs])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const selectUser = (user: User) => {
    setSelectedUser(user)
    setEditPlan(user.plan)
    setEditRole(user.role)
    setEditFlagged(user.is_flagged)
    setEditFlaggedReason(user.flagged_reason || "")
  }

  const saveUser = async () => {
    if (!selectedUser) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: editPlan,
          role: editRole,
          is_flagged: editFlagged,
          flagged_reason: editFlaggedReason || null,
        }),
      })
      if (res.ok) {
        await fetchUsers()
        await fetchStats()
        await fetchAuditLogs()
        setSelectedUser(null)
      }
    } finally {
      setUpdating(false)
    }
  }

  const trialDaysLeft = (endsAt: string | null) => {
    if (!endsAt) return null
    const diff = new Date(endsAt).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Stats Panel */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-white" },
            { label: "Active Trials", value: stats.activeTrials, icon: Clock, color: "text-blue-400" },
            { label: "Monthly", value: stats.monthlyUsers, icon: DollarSign, color: "text-green-400" },
            { label: "One-Time", value: stats.oneTimeUsers, icon: Check, color: "text-purple-400" },
            { label: "Expired", value: stats.expiredUsers, icon: X, color: "text-red-400" },
            { label: "Flagged", value: stats.flaggedUsers, icon: Flag, color: "text-orange-400" },
            { label: "Automations Today", value: stats.automationsToday, icon: Activity, color: "text-[#ffe14d]" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="border border-white/[0.08] rounded-xl p-4 bg-white/[0.02] flex items-center gap-3">
              <div className={`${color} opacity-80`}><Icon className="w-5 h-5" /></div>
              <div>
                <p className="font-mono text-2xl font-bold text-white">{value}</p>
                <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.08]">
        {(["users", "audit"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? "text-[#ffe14d] border-b-2 border-[#ffe14d]"
                : "text-neutral-500 hover:text-white"
            }`}
          >
            {tab === "users" ? "Users" : "Audit Log"}
          </button>
        ))}
      </div>

      {activeTab === "users" && (
        <div className="flex gap-6">
          {/* User Table */}
          <div className="flex-1 min-w-0">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2 border border-white/10 rounded-lg px-3 py-2 bg-white/[0.02]">
                <Search className="w-3.5 h-3.5 text-neutral-500" />
                <input
                  className="bg-transparent font-mono text-xs text-white outline-none placeholder:text-neutral-600 w-32"
                  placeholder="Search username..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                />
              </div>
              <select
                className="border border-white/10 rounded-lg px-3 py-2 bg-[#03010A] font-mono text-xs text-neutral-400 outline-none"
                value={filterPlan}
                onChange={e => { setFilterPlan(e.target.value); setPage(1) }}
              >
                <option value="">All Plans</option>
                <option value="trial">Trial</option>
                <option value="monthly">Monthly</option>
                <option value="one_time">One-Time</option>
                <option value="expired">Expired</option>
              </select>
              <select
                className="border border-white/10 rounded-lg px-3 py-2 bg-[#03010A] font-mono text-xs text-neutral-400 outline-none"
                value={filterFlagged}
                onChange={e => { setFilterFlagged(e.target.value); setPage(1) }}
              >
                <option value="">All Users</option>
                <option value="true">Flagged Only</option>
                <option value="false">Not Flagged</option>
              </select>
              <button
                onClick={() => { fetchUsers(); fetchStats() }}
                className="border border-white/10 rounded-lg px-3 py-2 text-neutral-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="border border-white/[0.08] rounded-xl overflow-hidden">
              <table className="w-full font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                    {["Username", "Plan", "Role", "Trial Left", "Flagged", "Joined"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-neutral-500 uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-600">Loading...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-600">No users found</td></tr>
                  ) : users.map(user => {
                    const daysLeft = trialDaysLeft(user.trial_ends_at)
                    return (
                      <tr
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className={`border-b border-white/[0.04] cursor-pointer transition-colors hover:bg-white/[0.03] ${
                          selectedUser?.id === user.id ? "bg-white/[0.05]" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-white">{user.username}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${PLAN_COLORS[user.plan] || "text-neutral-400"}`}>
                            {user.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] border ${ROLE_COLORS[user.role] || "text-neutral-400"}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-400">
                          {user.plan === "trial" && daysLeft !== null
                            ? <span className={daysLeft <= 0 ? "text-red-400" : daysLeft <= 2 ? "text-orange-400" : "text-blue-400"}>
                                {daysLeft <= 0 ? "Expired" : `${daysLeft}d`}
                              </span>
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {user.is_flagged
                            ? <span className="text-orange-400 flex items-center gap-1"><Flag className="w-3 h-3" /> Yes</span>
                            : <span className="text-neutral-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-neutral-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="font-mono text-xs text-neutral-500">Page {page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 border border-white/10 rounded-lg disabled:opacity-30 hover:border-white/30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 border border-white/10 rounded-lg disabled:opacity-30 hover:border-white/30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          {selectedUser && (
            <div className="w-72 flex-shrink-0 border border-white/[0.08] rounded-xl p-5 bg-white/[0.02] h-fit space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-sm font-bold text-white">@{selectedUser.username}</h3>
                <button onClick={() => setSelectedUser(null)} className="text-neutral-600 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1 text-[11px] font-mono text-neutral-500">
                <p>ID: {selectedUser.id}</p>
                <p>IP: {selectedUser.signup_ip || "unknown"}</p>
                <p>Joined: {new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Plan</label>
                  <select
                    className="mt-1 w-full border border-white/10 rounded-lg px-3 py-2 bg-[#03010A] font-mono text-xs text-white outline-none"
                    value={editPlan}
                    onChange={e => setEditPlan(e.target.value)}
                  >
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                    <option value="one_time">One-Time</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>

                <div>
                  <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Role</label>
                  <select
                    className="mt-1 w-full border border-white/10 rounded-lg px-3 py-2 bg-[#03010A] font-mono text-xs text-white outline-none"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Flagged</label>
                  <button
                    onClick={() => setEditFlagged(f => !f)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${editFlagged ? "bg-orange-500" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editFlagged ? "translate-x-5" : ""}`} />
                  </button>
                </div>

                {editFlagged && (
                  <div>
                    <label className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">Reason</label>
                    <input
                      className="mt-1 w-full border border-white/10 rounded-lg px-3 py-2 bg-[#03010A] font-mono text-xs text-white outline-none placeholder:text-neutral-600"
                      placeholder="Flag reason..."
                      value={editFlaggedReason}
                      onChange={e => setEditFlaggedReason(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={saveUser}
                disabled={updating}
                className="w-full bg-[#ffe14d] text-black font-mono text-xs font-bold py-2.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
              >
                {updating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                {["Time", "Admin", "Action", "Target", "Details"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-neutral-500 uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-600">No audit logs yet</td></tr>
              ) : auditLogs.map(log => (
                <tr key={log.id} className="border-b border-white/[0.04]">
                  <td className="px-4 py-3 text-neutral-500">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#ffe14d]">{log.admin?.username || "—"}</td>
                  <td className="px-4 py-3 text-white">{log.action}</td>
                  <td className="px-4 py-3 text-neutral-300">{log.target?.username || "—"}</td>
                  <td className="px-4 py-3 text-neutral-500 max-w-xs truncate">
                    {JSON.stringify(log.details?.after || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
