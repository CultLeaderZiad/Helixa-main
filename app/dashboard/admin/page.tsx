"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Users, TrendingUp, AlertTriangle, Shield, RefreshCw,
  Search, ChevronLeft, ChevronRight, X, Check,
  Activity, DollarSign, Clock, Flag, Zap, CreditCard, XCircle
} from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"

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
  id: string
  email: string
  role: string
  plan: string
  trial_ends_at: string | null
  is_flagged: boolean
  flagged_reason: string | null
  is_banned: boolean
  banned_reason: string | null
  signup_ip: string | null
  ip_risk_score: number | null
  vpn_suspected: boolean
  created_at: string
}

interface AuditLog {
  id: string
  action: string
  details: any
  created_at: string
  admin: { id: number; username: string; email?: string | null } | null
  target: { id: number; username: string; email?: string | null } | null
}

interface PaymentSubmission {
  id: string
  user_id: number
  transaction_reference: string
  note: string | null
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  plan_id?: string | null
  created_at: string
  accounts: { email: string | null } | null
  users: { username: string, plan: string }
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
  const [pendingPayments, setPendingPayments] = useState<PaymentSubmission[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [search, setSearch] = useState("")
  const [filterPlan, setFilterPlan] = useState("")
  const [filterFlagged, setFilterFlagged] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState<"users" | "audit" | "payments">("users")
  const [trialsThisWeek, setTrialsThisWeek] = useState<number | null>(null)
  
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

  const fetchPendingPayments = useCallback(async () => {
    const res = await fetch("/api/admin/payments?status=pending")
    const data = await res.json()
    if (data.payments) setPendingPayments(data.payments)
  }, [])

  const fetchTrialsThisWeek = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("plan", "trial")
        .gte("created_at", oneWeekAgo.toISOString())
      
      if (count !== null) setTrialsThisWeek(count)
    } catch (err) {
      console.error("Failed to fetch trials this week count", err)
    }
  }, [])

  const [bannerState, setBannerState] = useState({ isActive: false, message: "", link: "" })
  const [savingBanner, setSavingBanner] = useState(false)

  // Plan-Agent Matrix state
  const [agents, setAgents] = useState<any[]>([])
  const [planAgentsMap, setPlanAgentsMap] = useState<Record<string, boolean>>({})
  const [matrixDirty, setMatrixDirty] = useState(false)
  const [savingMatrix, setSavingMatrix] = useState(false)

  const fetchBanner = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/banner")
      const data = await res.json()
      if (data) setBannerState(data)
    } catch (err) {}
  }, [])

  const fetchMatrixData = useCallback(async () => {
      try {
          const agentsRes = await fetch("/api/admin/agents")
          const agentsData = await agentsRes.json()
          if (Array.isArray(agentsData)) setAgents(agentsData)

          const mappingRes = await fetch("/api/admin/plan_agents")
          const mappingData = await mappingRes.json()
          
          if (Array.isArray(mappingData)) {
              const newMap: Record<string, boolean> = {}
              mappingData.forEach((row: any) => {
                  newMap[`${row.plan_id}-${row.agent_id}`] = row.is_enabled
              })
              setPlanAgentsMap(newMap)
          }
      } catch(err) {
          console.error("Failed to fetch matrix data", err)
      }
  }, [])

  const savePlanAgents = async () => {
      setSavingMatrix(true)
      try {
          // Send each dirty mapping (or all for simplicity)
          const promises = Object.entries(planAgentsMap).map(([key, is_enabled]) => {
              const parts = key.split('-')
              const plan_id = parts[0]
              const agent_id = parts.slice(1).join('-')
              return fetch("/api/admin/plan_agents", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ plan_id, agent_id, is_enabled })
              })
          })
          await Promise.all(promises)
          setMatrixDirty(false)
          alert("Plan-Agent Matrix saved!")
      } catch (err) {
          alert("Failed to save Plan-Agent Matrix")
      } finally {
          setSavingMatrix(false)
      }
  }

  useEffect(() => {
    fetchStats()
    fetchAuditLogs()
    fetchTrialsThisWeek()
    fetchPendingPayments()
    fetchBanner()
    fetchMatrixData()
  }, [fetchStats, fetchAuditLogs, fetchTrialsThisWeek, fetchPendingPayments, fetchBanner, fetchMatrixData])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const adminChannel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchStats()
        fetchTrialsThisWeek()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_audit_log' }, () => {
        fetchAuditLogs()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_submissions' }, () => {
        fetchPendingPayments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(adminChannel)
    }
  }, [fetchStats, fetchAuditLogs, fetchTrialsThisWeek, fetchPendingPayments])

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
        await Promise.all([fetchUsers(), fetchStats(), fetchAuditLogs()])
        setSelectedUser(null)
      }
    } finally {
      setUpdating(false)
    }
  }

  const saveBanner = async () => {
    setSavingBanner(true)
    try {
      await fetch("/api/admin/settings/banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bannerState)
      })
      alert("Banner updated!")
    } catch (err) {
      alert("Failed to save banner")
    } finally {
      setSavingBanner(false)
    }
  }

  const handlePayment = async (paymentId: string, action: 'approve' | 'reject') => {
    let rejection_reason = null
    if (action === 'reject') {
      rejection_reason = prompt("Enter rejection reason (optional):")
      if (rejection_reason === null) return // Cancelled
    }

    // Optimistic: remove the row immediately so the UI reflects the action.
    const removed = pendingPayments.filter(p => p.id !== paymentId)
    setPendingPayments(removed)

    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejection_reason })
      })
      if (res.ok) {
        fetchPendingPayments()
        fetchUsers()
        fetchStats()
      } else {
        setPendingPayments(pendingPayments) // rollback
        alert("Failed to process payment")
      }
    } catch (err) {
      setPendingPayments(pendingPayments) // rollback
      alert("Error processing payment")
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
      {/* Live Banner */}
      {trialsThisWeek !== null && (
        <div className="bg-[#ffe14d]/10 border border-[#ffe14d]/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-500">
          <Zap className="w-5 h-5 text-[#ffe14d]" />
          <div>
            <p className="text-white font-mono text-sm">
              <span className="font-bold text-[#ffe14d]">{trialsThisWeek}</span> people started a trial this week.
            </p>
          </div>
        </div>
      )}

      {/* Pending Payments Alert */}
      {pendingPayments.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-500">
          <CreditCard className="w-5 h-5 text-blue-400" />
          <div className="flex-1">
            <p className="text-white font-mono text-sm">
              <span className="font-bold text-blue-400">{pendingPayments.length}</span> pending payment{pendingPayments.length !== 1 ? 's' : ''} require your review.
            </p>
          </div>
          <button 
            onClick={() => setActiveTab('payments' as any)}
            className="text-xs font-mono font-bold bg-blue-500/20 text-blue-400 px-3 py-1 rounded hover:bg-blue-500/30 transition-colors"
          >
            Review Now
          </button>
        </div>
      )}

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
      <div className="flex gap-1 border-b border-white/[0.08] overflow-x-auto scrollbar-none">
        {(["users", "audit", "payments", "matrix", "banner"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition-colors relative whitespace-nowrap ${
              activeTab === tab
                ? "text-[#ffe14d] border-b-2 border-[#ffe14d]"
                : "text-neutral-500 hover:text-white"
            }`}
          >
            {tab === "users" ? "Users" : tab === "audit" ? "Audit Log" : tab === "payments" ? "Payments" : tab === "matrix" ? "Plan Matrix" : "Banner"}
            {tab === "payments" && pendingPayments.length > 0 && (
              <span className="absolute top-1.5 right-1 w-2 h-2 rounded-full bg-blue-500" />
            )}
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
                  placeholder="Search email..."
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
                    {["Email", "Plan", "Role", "Trial Left", "Flagged", "Joined"].map(h => (
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
                        <td className="px-4 py-3 text-white">{user.email}</td>
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
                <h3 className="font-mono text-sm font-bold text-white truncate max-w-[200px]" title={selectedUser.email}>{selectedUser.email}</h3>
                <button onClick={() => setSelectedUser(null)} className="text-neutral-600 hover:text-white flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <a href={`mailto:${selectedUser.email}`} className="flex items-center justify-center gap-2 bg-blue-500/10 text-blue-400 py-2 rounded-lg font-mono text-xs hover:bg-blue-500/20 transition-colors">
                  Email
                </a>
                <button onClick={() => window.open(`/dashboard?view_as=${selectedUser.id}`, '_blank')} className="flex items-center justify-center gap-2 bg-purple-500/10 text-purple-400 py-2 rounded-lg font-mono text-xs hover:bg-purple-500/20 transition-colors">
                  View As
                </button>
              </div>

              <div className="space-y-1 text-[11px] font-mono text-neutral-500">
                <p>ID: {selectedUser.id}</p>
                <p>IP: {selectedUser.signup_ip || "unknown"}</p>
                <p>Joined: {new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>

              {/* IP / Fraud Risk Info */}
              <div className="p-3 border border-white/10 rounded-lg bg-[#03010A] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">IP Risk</span>
                  <span className={`font-mono text-xs font-bold ${
                    (selectedUser.ip_risk_score ?? 0) > 85 ? 'text-red-400' :
                    (selectedUser.ip_risk_score ?? 0) > 50 ? 'text-orange-400' : 'text-green-400'
                  }`}>
                    {selectedUser.ip_risk_score !== null ? selectedUser.ip_risk_score : "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">VPN/Proxy</span>
                  <span className={`font-mono text-xs font-bold ${selectedUser.vpn_suspected ? 'text-red-400' : 'text-neutral-400'}`}>
                    {selectedUser.vpn_suspected ? "Yes" : "No"}
                  </span>
                </div>
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
                  <td className="px-4 py-3 text-[#ffe14d]">{log.admin?.email || "—"}</td>
                  <td className="px-4 py-3 text-white">{log.action}</td>
                  <td className="px-4 py-3 text-neutral-300">{log.target?.email || "—"}</td>
                  <td className="px-4 py-3 text-neutral-500 max-w-xs truncate">
                    {JSON.stringify(log.details?.after || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                {["Time", "Email", "Transaction Ref", "Amount", "Ordered Plan", "Note (Client Name)", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-neutral-500 uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingPayments.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-neutral-600">No pending payments.</td></tr>
              ) : pendingPayments.map(payment => (
                <tr key={payment.id} className="border-b border-white/[0.04]">
                  <td className="px-4 py-3 text-neutral-500">{new Date(payment.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-white font-bold">{payment.accounts?.email || `ID: ${payment.user_id}`}</td>
                  <td className="px-4 py-3 text-[#ffe14d]">{payment.transaction_reference}</td>
                  <td className="px-4 py-3 text-green-400">${payment.amount}</td>
                  <td className="px-4 py-3 text-blue-400 capitalize">{payment.plan_id || payment.users?.plan || "monthly"}</td>
                  <td className="px-4 py-3 text-neutral-400 max-w-[200px] truncate" title={payment.note || ""}>
                    {payment.note || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handlePayment(payment.id, 'approve')}
                        className="p-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handlePayment(payment.id, 'reject')}
                        className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Reject"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      {activeTab === "banner" && (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden p-6 bg-white/[0.02] space-y-6 max-w-2xl">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-mono">Global Announcement Banner</h2>
            <p className="text-neutral-400 font-mono text-xs">Update the banner shown at the top of every page across the app.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="font-mono text-xs text-neutral-500 uppercase tracking-wider w-24">Active</label>
              <button
                onClick={() => setBannerState(s => ({ ...s, isActive: !s.isActive }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${bannerState.isActive ? "bg-green-500" : "bg-white/10"}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${bannerState.isActive ? "translate-x-6" : ""}`} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="font-mono text-xs text-neutral-500 uppercase tracking-wider w-24">Message</label>
              <input
                className="flex-1 border border-white/10 rounded-lg px-3 py-2 bg-[#03010A] font-mono text-sm text-white outline-none placeholder:text-neutral-600"
                placeholder="e.g. Helixa v2.0 is now live!"
                value={bannerState.message}
                onChange={e => setBannerState(s => ({ ...s, message: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="font-mono text-xs text-neutral-500 uppercase tracking-wider w-24">Link URL</label>
              <input
                className="flex-1 border border-white/10 rounded-lg px-3 py-2 bg-[#03010A] font-mono text-sm text-white outline-none placeholder:text-neutral-600"
                placeholder="e.g. /dashboard/agents"
                value={bannerState.link}
                onChange={e => setBannerState(s => ({ ...s, link: e.target.value }))}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={saveBanner}
                disabled={savingBanner}
                className="bg-[#ffe14d] text-black font-mono text-sm font-bold px-6 py-2 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
              >
                {savingBanner ? "Saving..." : "Save Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white font-mono">Plan-Agent Matrix</h2>
              <p className="text-neutral-400 font-mono text-xs">Configure which agents are available in each plan.</p>
            </div>
            <button
                onClick={savePlanAgents}
                disabled={savingMatrix}
                className="bg-[#ffe14d] text-black font-mono text-sm font-bold px-6 py-2 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {savingMatrix ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {savingMatrix ? "Saving..." : "Save Matrix"}
            </button>
          </div>

          <div className="border border-white/[0.08] rounded-xl overflow-x-auto">
            <table className="w-full font-mono text-sm text-left">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="px-6 py-4 text-neutral-400 font-medium">Agent</th>
                  {["trial", "monthly", "one_time"].map(plan => (
                    <th key={plan} className="px-6 py-4 font-medium text-center capitalize text-white">
                      {plan.replace('_', '-')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {agents.map(agent => (
                  <tr key={agent.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0">
                          {agent.icon && <span className="text-lg">{agent.icon}</span>}
                        </div>
                        <div>
                          <p className="text-white font-bold">{agent.name}</p>
                          <p className="text-xs text-neutral-500 max-w-xs truncate">{agent.description}</p>
                        </div>
                        {!agent.is_active && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-wider ml-2">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    {["trial", "monthly", "one_time"].map(plan => {
                      const mappingKey = `${plan}-${agent.id}`
                      const isEnabled = !!planAgentsMap[mappingKey]
                      
                      return (
                        <td key={plan} className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                                setPlanAgentsMap(prev => ({
                                    ...prev,
                                    [mappingKey]: !isEnabled
                                }))
                                setMatrixDirty(true)
                            }}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              isEnabled ? 'bg-green-500' : 'bg-white/10'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isEnabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-neutral-500">
                      No agents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {matrixDirty && (
              <div className="flex justify-end">
                <p className="text-orange-400 text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    You have unsaved changes
                </p>
              </div>
          )}
        </div>
      )}
    </div>
  )
}
