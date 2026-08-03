"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Edit2, Trash2 } from "lucide-react"

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete plan")
      fetchPlans()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Plans & Billing</h1>
        <button className="flex items-center gap-2 bg-[#ffe14d] text-black px-4 py-2 rounded-lg font-medium text-sm hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Add Plan
        </button>
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
            <div key={plan.id} className="border border-white/10 bg-white/5 rounded-xl p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-xs text-neutral-400 mt-1">{plan.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-neutral-400 hover:text-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(plan.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-neutral-400 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="font-mono text-xl">${plan.price_usd}</div>
                <div className="text-xs bg-white/10 px-2 py-1 rounded-full uppercase tracking-wider">{plan.billing_cycle}</div>
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
    </div>
  )
}
