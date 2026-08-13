"use client"

import { useState } from "react"
import { CheckCircle, Zap, Star } from "lucide-react"
import Link from "next/link"
import ElectricBorder from "@/components/ui/electric-border"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function PricingClient({ plans }: { plans: any[] }) {
  const [isAnnual, setIsAnnual] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    company: "",
    needs_description: ""
  })

  const mainPlan = plans.find(p => !p.is_contact_sales && p.billing_cycle === "monthly") || plans[0]
  const enterprisePlan = plans.find(p => p.is_contact_sales)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/enterprise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error("Failed to submit inquiry")
      alert("Inquiry submitted successfully! We will contact you soon.")
      setDialogOpen(false)
      setForm({ full_name: "", email: "", company: "", needs_description: "" })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderPlatformIcons = () => (
    <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/10">
      <img src="/instagram.svg" alt="Instagram" className="w-5 h-5 opacity-80" />
      <img src="/facebook.svg" alt="Facebook" className="w-5 h-5 opacity-80" />
      <img src="/whatsapp.svg" alt="WhatsApp" className="w-5 h-5 opacity-80" />
      <img src="/telegram.svg" alt="Telegram" className="w-5 h-5 opacity-80" />
      <div className="relative group flex items-center justify-center">
        <img src="/tiktok.svg" alt="TikTok" className="w-5 h-5 opacity-30 grayscale" />
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/20">
          Coming Soon
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-12">
      {/* Toggle */}
      {mainPlan && mainPlan.price_yearly && (
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm font-medium ${!isAnnual ? "text-white" : "text-neutral-400"}`}>Monthly</span>
          <Switch 
            checked={isAnnual} 
            onCheckedChange={setIsAnnual} 
            className="data-[state=checked]:bg-[#ffe14d]"
          />
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isAnnual ? "text-white" : "text-neutral-400"}`}>Annually</span>
            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Save 20%</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
        {/* Free Trial */}
        <div className="relative pt-4">
          <ElectricBorder color="#ffffff" speed={6} containerClassName="rounded-2xl flex-col flex h-full">
            <div className="p-8 flex flex-col h-full bg-white/[0.03] border border-white/10 rounded-2xl relative">
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-2">Free Trial</h3>
                <p className="text-neutral-400 text-sm">To test the waters.</p>
                <div className="mt-4 text-3xl font-bold text-white">$0</div>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {["Full access to all features", "7-day limit", "No credit card required"].map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-neutral-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/login" className="w-full block text-center bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-colors">
                Start Free Trial
              </Link>
            </div>
          </ElectricBorder>
        </div>

        {/* Main Plan */}
        {mainPlan && (
          <div className="relative pt-4">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#ffe14d] text-black px-4 py-1.5 rounded-full text-xs font-bold tracking-wider z-20 whitespace-nowrap shadow-xl border border-black/20">
              BEST VALUE
            </div>
            <ElectricBorder color="#ffe14d" speed={2} containerClassName="rounded-2xl flex-col flex h-full">
              <div className="p-8 flex flex-col h-full bg-white/[0.03] border border-white/10 rounded-2xl relative">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-[#ffe14d]" />
                    <h3 className="text-xl font-bold text-[#ffe14d]">{mainPlan.name}</h3>
                  </div>
                  <p className="text-neutral-400 text-sm">{mainPlan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">
                      ${isAnnual ? mainPlan.price_yearly : mainPlan.price_usd}
                    </span>
                    <span className="text-neutral-500">/{isAnnual ? 'yr' : 'mo'}</span>
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8 flex-1">
                  {(mainPlan.features || [])
                    .filter((f: string) => !f.toLowerCase().includes("only one platform"))
                    .map((f: string) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-neutral-300">
                      <CheckCircle className="w-5 h-5 text-[#ffe14d] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {renderPlatformIcons()}

                <Link 
                  href={`/checkout/${mainPlan.id}${isAnnual ? '?cycle=yearly' : '?cycle=monthly'}`} 
                  className="mt-6 w-full block text-center font-bold py-3 rounded-xl transition-colors bg-[#ffe14d] hover:bg-[#e6c738] text-black"
                >
                  Select {mainPlan.name}
                </Link>
              </div>
            </ElectricBorder>
          </div>
        )}

        {/* Enterprise Plan */}
        <div className="relative pt-4">
          <ElectricBorder color="#ffffff" speed={6} containerClassName="rounded-2xl flex-col flex h-full">
            <div className="p-8 flex flex-col h-full bg-white/[0.03] border border-white/10 rounded-2xl relative">
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-white" />
                  <h3 className="text-xl font-bold text-white">{enterprisePlan?.name || "Enterprise"}</h3>
                </div>
                <p className="text-neutral-400 text-sm">{enterprisePlan?.description || "For large teams and custom needs."}</p>
                <div className="mt-4 text-3xl font-bold text-white">Custom pricing</div>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                {(enterprisePlan?.features || ["Custom integrations", "Dedicated account manager", "SLA guarantees", "Custom limits"])
                  .map((f: string) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-neutral-300">
                    <CheckCircle className="w-5 h-5 text-neutral-500 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {renderPlatformIcons()}

              <button 
                onClick={() => setDialogOpen(true)}
                className="mt-6 w-full block text-center bg-white/10 hover:bg-white/20 text-white font-medium py-3 rounded-xl transition-colors"
              >
                Contact Sales
              </button>
            </div>
          </ElectricBorder>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0B0812] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Contact Sales</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Tell us about your needs and our team will get back to you with a custom plan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input 
                required 
                value={form.full_name}
                onChange={e => setForm({...form, full_name: e.target.value})}
                className="bg-white/5 border-white/10" 
                placeholder="John Doe" 
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                required 
                type="email"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="bg-white/5 border-white/10" 
                placeholder="john@example.com" 
              />
            </div>
            <div className="space-y-2">
              <Label>Company (optional)</Label>
              <Input 
                value={form.company}
                onChange={e => setForm({...form, company: e.target.value})}
                className="bg-white/5 border-white/10" 
                placeholder="Acme Inc." 
              />
            </div>
            <div className="space-y-2">
              <Label>What are your needs?</Label>
              <Textarea 
                value={form.needs_description}
                onChange={e => setForm({...form, needs_description: e.target.value})}
                className="bg-white/5 border-white/10" 
                placeholder="Tell us about your volume, custom integrations, etc." 
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 text-neutral-300 hover:bg-white/5">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#ffe14d] text-black hover:brightness-110">
                {isSubmitting ? "Submitting..." : "Submit Inquiry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
