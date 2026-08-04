"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Plan {
  id: string
  name: string
  description: string | null
  price_usd: number
  billing_cycle: "monthly" | "yearly" | "lifetime"
  features: string[] | null
  is_active: boolean
  stripe_price_id: string | null
}

const EMPTY_FORM = {
  name: "",
  description: "",
  price_usd: "",
  billing_cycle: "monthly" as Plan["billing_cycle"],
  features: "",
  stripe_price_id: "",
  is_active: true,
}

export default function DashboardAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      setError("")
      const res = await fetch("/api/admin/plans")
      if (!res.ok) throw new Error("Failed to load plans")
      const data = await res.json()
      setPlans(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id)
    setForm({
      name: plan.name,
      description: plan.description || "",
      price_usd: String(plan.price_usd),
      billing_cycle: plan.billing_cycle,
      features: Array.isArray(plan.features) ? plan.features.join(", ") : "",
      stripe_price_id: plan.stripe_price_id || "",
      is_active: plan.is_active,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.price_usd) {
      alert("Name and price are required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price_usd: parseFloat(form.price_usd),
        billing_cycle: form.billing_cycle,
        features: form.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        stripe_price_id: form.stripe_price_id.trim() || null,
        is_active: form.is_active,
      }

      const res = editingId
        ? await fetch(`/api/admin/plans/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save plan")
      }

      setDialogOpen(false)
      await fetchPlans()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (plan: Plan) => {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !plan.is_active }),
      })
      if (!res.ok) throw new Error("Failed to update plan")
      await fetchPlans()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete plan")
      await fetchPlans()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Plans & Billing</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Changes go live on the public pricing page immediately.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-[#ffe14d] text-black hover:brightness-110">
          <Plus className="w-4 h-4 mr-1.5" /> Add Plan
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border border-white/10 bg-white/[0.03] rounded-xl p-6 flex flex-col gap-4 ${
                !plan.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                    {plan.description || "No description"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(plan)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white"
                    title="Edit plan"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-neutral-400 hover:text-red-400"
                    title="Delete plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-xl text-white">${plan.price_usd}</span>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                    {plan.billing_cycle}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase tracking-wider ${
                      plan.is_active ? "text-green-400" : "text-neutral-500"
                    }`}
                  >
                    {plan.is_active ? "Live" : "Hidden"}
                  </span>
                  <Switch
                    checked={plan.is_active}
                    onCheckedChange={() => handleToggleActive(plan)}
                  />
                </div>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full p-8 text-center border border-dashed border-white/10 rounded-xl text-neutral-500">
              No plans found. Create one to get started.
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0B0812] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "Add Plan"}</DialogTitle>
            <DialogDescription className="text-neutral-400">
              {editingId
                ? "Update the plan — changes apply to the public pricing page immediately."
                : "Create a new plan visible on the public pricing page."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-neutral-300">Name</Label>
                <Input
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Pro Plan"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-neutral-300">Price (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="9.99"
                  value={form.price_usd}
                  onChange={(e) => setForm({ ...form, price_usd: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-neutral-300">Description</Label>
              <Textarea
                className="bg-white/5 border-white/10 text-white"
                placeholder="What does this plan include?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-neutral-300">Billing Cycle</Label>
                <Select
                  value={form.billing_cycle}
                  onValueChange={(v) =>
                    setForm({ ...form, billing_cycle: v as Plan["billing_cycle"] })
                  }
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B0812] border-white/10 text-white">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-neutral-300">Stripe Price ID (optional)</Label>
                <Input
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="price_..."
                  value={form.stripe_price_id}
                  onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-neutral-300">Features (comma separated)</Label>
              <Textarea
                className="bg-white/5 border-white/10 text-white"
                placeholder="Unlimited automations, AI ice breakers, Priority support"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3">
              <div>
                <p className="text-sm text-white">Active on pricing page</p>
                <p className="text-xs text-neutral-500">Toggle to show or hide this plan publicly.</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/10 text-neutral-300 hover:bg-white/5">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#ffe14d] text-black hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
