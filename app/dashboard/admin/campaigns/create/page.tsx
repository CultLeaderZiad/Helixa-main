"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Save } from "lucide-react"
import { toast } from "react-hot-toast"

export default function CreateCampaignPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    preview_text: "",
    template: "product_update",
    hero_image: "",
    heading: "",
    subheading: "",
    body_text: "",
    cta_text: "",
    cta_url: "",
    audience_filter: "all"
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSaveDraft = async () => {
    if (!formData.name || !formData.subject || !formData.heading) {
      toast.error("Name, subject, and heading are required")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error("Failed to create campaign")
      
      const data = await res.json()
      toast.success("Draft saved successfully")
      router.push(`/dashboard/admin/campaigns/${data.campaign.id}`)
    } catch (error) {
      toast.error("Failed to save draft")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          <h2 className="text-2xl font-bold tracking-tight text-white">Create Campaign</h2>
          <p className="text-zinc-400 text-sm mt-1">Configure your email content and audience</p>
        </div>
      </div>

      <Card className="bg-[#0a0a0a] border-zinc-800">
        <CardContent className="p-6 space-y-8">
          
          {/* Section 1: Meta */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">Campaign Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Internal Campaign Name *</Label>
                <Input 
                  id="name" name="name" 
                  placeholder="e.g. Q3 Feature Launch" 
                  value={formData.name} onChange={handleChange}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience_filter">Target Audience *</Label>
                <Select value={formData.audience_filter} onValueChange={(val) => handleSelectChange('audience_filter', val)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="paid">All Paid (Monthly & One-Time)</SelectItem>
                    <SelectItem value="trial">Free Trial Only</SelectItem>
                    <SelectItem value="monthly">Monthly Plan Only</SelectItem>
                    <SelectItem value="one_time">One-Time Plan Only</SelectItem>
                    <SelectItem value="expired">Expired Subs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject Line *</Label>
              <Input 
                id="subject" name="subject" 
                placeholder="e.g. Exciting new features in Helixa!" 
                value={formData.subject} onChange={handleChange}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="preview_text">Preview Text (Optional)</Label>
              <Input 
                id="preview_text" name="preview_text" 
                placeholder="Shows up in the inbox preview next to subject line" 
                value={formData.preview_text} onChange={handleChange}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>

          {/* Section 2: Content */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">Email Content</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="template">Design Template</Label>
                <Select value={formData.template} onValueChange={(val) => handleSelectChange('template', val)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="product_update">Product Update</SelectItem>
                    <SelectItem value="new_feature">New Feature</SelectItem>
                    <SelectItem value="announcement">General Announcement</SelectItem>
                    <SelectItem value="promotion">Promotion / Discount</SelectItem>
                    <SelectItem value="trial_expiring">Trial Expiring Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero_image">Hero Image URL (Optional)</Label>
                <Input 
                  id="hero_image" name="hero_image" 
                  placeholder="https://..." 
                  value={formData.hero_image} onChange={handleChange}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heading">Main Heading *</Label>
              <Input 
                id="heading" name="heading" 
                placeholder="e.g. Introducing AI Replies" 
                value={formData.heading} onChange={handleChange}
                className="bg-zinc-900 border-zinc-800"
              />
              <p className="text-xs text-zinc-500">Supports {{customer_name}} variable</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subheading">Subheading (Optional)</Label>
              <Input 
                id="subheading" name="subheading" 
                placeholder="e.g. Automate your DMs like never before." 
                value={formData.subheading} onChange={handleChange}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body_text">Body Text</Label>
              <Textarea 
                id="body_text" name="body_text" 
                placeholder="The main message of your email..." 
                rows={6}
                value={formData.body_text} onChange={handleChange}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cta_text">Button Text (Optional)</Label>
                <Input 
                  id="cta_text" name="cta_text" 
                  placeholder="e.g. Try it now" 
                  value={formData.cta_text} onChange={handleChange}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta_url">Button URL (Optional)</Label>
                <Input 
                  id="cta_url" name="cta_url" 
                  placeholder="https://..." 
                  value={formData.cta_url} onChange={handleChange}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-800">
            <Button 
              onClick={handleSaveDraft} 
              disabled={loading}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft & Continue
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
