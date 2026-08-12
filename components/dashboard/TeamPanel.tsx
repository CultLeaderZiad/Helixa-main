"use client"

import { useState, useEffect } from "react"
import { Users, Mail, Loader2, Trash2, Plus, AlertCircle, Shield } from "lucide-react"
import { toast } from "sonner"

export function TeamPanel() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(0)
  const [userRole, setUserRole] = useState("admin")
  
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("viewer")
  const [inviting, setInviting] = useState(false)

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team")
      const data = await res.json()
      if (res.ok) {
        setMembers(data.members || [])
        setLimit(data.limit || 0)
      } else {
        toast.error(data.error || "Failed to load team")
      }
      
      const authRes = await fetch("/api/auth/me")
      const authData = await authRes.json()
      if (authRes.ok) {
        setUserRole(authData.permission_level || "admin")
      }
    } catch (e) {
      toast.error("Error connecting to server")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeam()
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    setInviting(true)

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, permission_level: inviteRole })
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`Invited ${inviteEmail}`)
        setInviteEmail("")
        fetchTeam()
      } else {
        toast.error(data.error || "Failed to invite member")
      }
    } catch (e) {
      toast.error("Error sending invite")
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return
    try {
      const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Member removed")
        fetchTeam()
      } else {
        toast.error("Failed to remove member")
      }
    } catch (e) {
      toast.error("Error removing member")
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>
  }

  return (
    <div className="p-6 rounded-2xl border border-white/10 bg-[#0b0b0a] hover:border-white/20 transition-colors">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-white font-medium">Agency Team</h3>
            <p className="text-xs text-muted-foreground">Manage your team members ({members.length}/{limit} seats used)</p>
          </div>
        </div>
      </div>

      {userRole === "admin" && (
        <form onSubmit={handleInvite} className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="colleague@agency.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-purple-500/50"
              required
            />
          </div>
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none [&>option]:bg-[#0b0b0a] [&>option]:text-white"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={inviting || members.length >= limit}
            className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Invite
          </button>
        </form>
      )}

      {userRole === "admin" && members.length >= limit && (
        <div className="mb-4 flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>You have reached your team seat limit. Upgrade your plan to add more members.</p>
        </div>
      )}

      <div className="space-y-2">
        {members.length === 0 ? (
          <div className="text-center py-6 text-sm text-neutral-500 border border-dashed border-white/10 rounded-xl">
            No team members yet. Invite someone above.
          </div>
        ) : (
          members.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div>
                <p className="text-sm text-white font-medium">{member.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${member.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-neutral-500/20 text-neutral-400'}`}>
                    {member.status}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-neutral-400 uppercase tracking-wider">
                    <Shield className="w-3 h-3" />
                    {member.permission_level}
                  </span>
                </div>
              </div>
              {userRole === "admin" && (
                <button
                  onClick={() => handleRemove(member.id)}
                  className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
