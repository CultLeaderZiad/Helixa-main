"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Send, Activity, Users, Mail, AlertTriangle } from "lucide-react"
import { toast } from "react-hot-toast"

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  audience_filter: string
  recipient_count: number
}

interface CustomerPreview {
  id: string
  email: string
  plan: string
}

export default function CampaignDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [audience, setAudience] = useState<CustomerPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingTest, setSendingTest] = useState(false)
  const [sendingReal, setSendingReal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Campaign
      const resCamp = await fetch(`/api/admin/campaigns/${id}`)
      if (!resCamp.ok) throw new Error("Failed to fetch campaign")
      const campData = await resCamp.json()
      setCampaign(campData.campaign)

      // 2. Fetch Audience Preview
      const resAud = await fetch(`/api/admin/customers?filter=${campData.campaign.audience_filter}`)
      if (resAud.ok) {
        const audData = await resAud.json()
        setAudience(audData.customers || [])
      }
    } catch (error) {
      toast.error("Failed to load details")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async () => {
    setSendingTest(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/send-test`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send test")
      toast.success("Test email sent to your admin email!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSendingTest(false)
    }
  }

  const handleSendReal = async () => {
    if (!confirm(`Are you absolutely sure you want to send this email to ${audience.length} customers? This cannot be undone.`)) return

    setSendingReal(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${id}/send`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send campaign")
      
      toast.success(`Campaign sent to ${data.recipient_count} recipients!`)
      fetchData() // Refresh status
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSendingReal(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
  }

  if (!campaign) {
    return <div className="text-center p-12 text-zinc-400">Campaign not found.</div>
  }

  const isDraft = campaign.status === "draft"

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push("/dashboard/admin/campaigns")}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {campaign.name}
              <span className={`text-xs px-2 py-0.5 rounded-full border ${isDraft ? 'bg-zinc-800 text-zinc-300 border-zinc-700' : 'bg-brand-500/10 text-brand-400 border-brand-500/20'}`}>
                {campaign.status.toUpperCase()}
              </span>
            </h2>
            <p className="text-zinc-400 text-sm mt-1">Subject: {campaign.subject}</p>
          </div>
        </div>
        
        {isDraft && (
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={handleSendTest}
              disabled={sendingTest || sendingReal}
              className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              {sendingTest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Test Email
            </Button>
            <Button 
              onClick={handleSendReal}
              disabled={sendingTest || sendingReal || audience.length === 0}
              className="bg-brand-500 hover:bg-brand-600 text-black font-semibold"
            >
              {sendingReal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send to {audience.length} Customers
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Audience Preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#0a0a0a] border-zinc-800">
            <CardHeader className="border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-400" />
                    Audience Preview
                  </CardTitle>
                  <CardDescription>
                    Filter: <strong>{campaign.audience_filter}</strong> ({audience.length} matching customers)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/80 sticky top-0 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {audience.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-zinc-500">
                        No customers match this filter.
                      </td>
                    </tr>
                  ) : (
                    audience.map(c => (
                      <tr key={c.id} className="hover:bg-zinc-900/30">
                        <td className="px-6 py-3 text-white">{c.email}</td>
                        <td className="px-6 py-3 text-zinc-400">{c.plan}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Right Col - Checklist & Status */}
        <div className="space-y-6">
          <Card className="bg-[#0a0a0a] border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-lg">Pre-Flight Checklist</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-zinc-800">
                <li className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-1 ${campaign.subject ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {campaign.subject ? <Send className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Subject Line</p>
                    <p className="text-xs text-zinc-500">{campaign.subject || "Missing"}</p>
                  </div>
                </li>
                <li className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-1 ${audience.length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {audience.length > 0 ? <Users className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Valid Audience</p>
                    <p className="text-xs text-zinc-500">{audience.length} recipients found</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          {!isDraft && (
            <Card className="bg-[#0a0a0a] border-zinc-800">
              <CardHeader className="border-b border-zinc-800">
                <CardTitle className="text-lg">Delivery Status</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center">
                <Activity className="w-8 h-8 text-brand-400 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-white">{campaign.recipient_count}</h3>
                <p className="text-sm text-zinc-400">Total Recipients Processed</p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
