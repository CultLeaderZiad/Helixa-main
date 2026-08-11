"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Mail, Clock, Send, AlertTriangle, ArrowRight, Activity, Users } from "lucide-react"
import { toast } from "react-hot-toast"

interface Campaign {
  id: string
  name: string
  subject: string
  template: string
  status: 'draft' | 'sending' | 'completed' | 'failed'
  audience_filter: string
  recipient_count: number
  created_at: string
  sent_at: string | null
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/campaigns")
      if (!res.ok) throw new Error("Failed to fetch campaigns")
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      toast.error("Failed to load campaigns")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'draft':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-zinc-800 text-zinc-300 font-medium border border-zinc-700 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Draft</span>
      case 'sending':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20 flex items-center gap-1.5"><Activity className="w-3 h-3 animate-pulse" /> Sending</span>
      case 'completed':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 flex items-center gap-1.5"><Send className="w-3 h-3" /> Sent</span>
      case 'failed':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-red-500/10 text-red-400 font-medium border border-red-500/20 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> Failed</span>
      default:
        return null
    }
  }

  const formatAudience = (filter: string) => {
    const map: Record<string, string> = {
      'all': 'All Customers',
      'paid': 'All Paid',
      'trial': 'Free Trial',
      'monthly': 'Monthly Plan',
      'one_time': 'One-Time Plan',
      'expired': 'Expired Subs'
    }
    return map[filter] || filter
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-brand-400" />
            Communication Center
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Create and send email campaigns to your customers.
          </p>
        </div>
        <Button 
          onClick={() => router.push("/dashboard/admin/campaigns/create")}
          className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-semibold"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-400">Total Campaigns</p>
                <p className="text-3xl font-bold text-white">{campaigns.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-brand-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-400">Total Emails Sent</p>
                <p className="text-3xl font-bold text-white">
                  {campaigns.filter(c => c.status === 'completed').reduce((acc, curr) => acc + (curr.recipient_count || 0), 0)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#0a0a0a] border-zinc-800">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-400">Active Drafts</p>
                <p className="text-3xl font-bold text-white">{campaigns.filter(c => c.status === 'draft').length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <Clock className="w-5 h-5 text-zinc-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card className="bg-[#0a0a0a] border-zinc-800 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
          <CardTitle className="text-lg">Recent Campaigns</CardTitle>
          <CardDescription>View and manage your email campaigns</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500 flex flex-col items-center">
              <Activity className="w-8 h-8 animate-spin text-brand-500 mb-2" />
              Loading campaigns...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
                <Mail className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">No campaigns yet</h3>
              <p className="text-zinc-400 max-w-sm mb-6">Create your first email campaign to announce new features, product updates, or promotions to your customers.</p>
              <Button 
                onClick={() => router.push("/dashboard/admin/campaigns/create")}
                className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-semibold"
              >
                Create Campaign
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/50 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Campaign Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Audience</th>
                  <th className="px-6 py-4 font-medium">Recipients</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {campaigns.map((campaign) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={campaign.id} 
                    className="hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/dashboard/admin/campaigns/${campaign.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{campaign.name}</div>
                      <div className="text-zinc-500 text-xs truncate max-w-xs">{campaign.subject}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-zinc-300">
                        <Users className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                        {formatAudience(campaign.audience_filter)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300">
                      {campaign.status === 'draft' ? '-' : campaign.recipient_count}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs">
                      {new Date(campaign.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-400 hover:text-brand-300 hover:bg-brand-500/10">
                        {campaign.status === 'draft' ? 'Edit' : 'View'} 
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
