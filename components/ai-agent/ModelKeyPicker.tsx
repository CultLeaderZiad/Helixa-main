"use client"

import React, { useState } from "react"
import { KeyRound, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface ModelProvider {
  name: string
  isDefault?: boolean
  arabicScore: number // out of 4
  speedScore: number // out of 4
  costScore: number // out of 4
}

const providers: ModelProvider[] = [
  { name: "Groq - Llama", isDefault: true, arabicScore: 3, speedScore: 4, costScore: 1 },
  { name: "Gemini", arabicScore: 4, speedScore: 3, costScore: 2 },
  { name: "Anthropic", arabicScore: 4, speedScore: 2, costScore: 3 },
]

function RatingDots({ score, max = 4 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < score ? "bg-[var(--t1)]" : "bg-[var(--s4)]"
          }`}
        />
      ))}
    </div>
  )
}

export function ModelKeyPicker() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState("groq")
  const [apiKey, setApiKey] = useState("")

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key")
      return
    }
    toast.success(`Configured custom API key for ${selectedProvider}`)
    setDialogOpen(false)
    setApiKey("")
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 select-none space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[13.5px] font-semibold text-[var(--t1)] tracking-tight">
          Model
        </h3>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="h-[26px] px-2 text-[11px] font-medium gap-1 text-[var(--gold2)]"
        >
          <KeyRound className="w-3 h-3 text-[var(--gold)]" />
          <span>Your own key</span>
        </Button>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11.5px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)] text-[10.5px] font-mono uppercase text-[var(--t3)]">
              <th className="pb-2 font-medium">Provider</th>
              <th className="pb-2 font-medium">Arabic</th>
              <th className="pb-2 font-medium">Speed</th>
              <th className="pb-2 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {providers.map((p) => (
              <tr key={p.name} className="hover:bg-[var(--s2)] transition-colors">
                <td className="py-2.5 font-medium text-[var(--t1)] flex items-center gap-1.5">
                  <span>{p.name}</span>
                  {p.isDefault && (
                    <span className="font-mono text-[9.5px] px-1 py-0.2 rounded bg-[var(--s3)] text-[var(--t3)] border border-[var(--line2)] leading-none">
                      Default
                    </span>
                  )}
                </td>
                <td className="py-2.5">
                  <RatingDots score={p.arabicScore} />
                </td>
                <td className="py-2.5">
                  <RatingDots score={p.speedScore} />
                </td>
                <td className="py-2.5">
                  <RatingDots score={p.costScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10.5px] text-[var(--t4)] font-mono">
        Ratings are placeholders until we benchmark dialect accuracy.
      </p>

      {/* BYOK Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[var(--s1)] border-[var(--line)] text-[var(--t1)]">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              Bring Your Own Model Key (BYOK)
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--t3)]">
              Use your own Groq, Gemini, or Anthropic API key to pay provider costs directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11.5px] text-[var(--t2)] font-medium block mb-1">
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full h-8 bg-[var(--s2)] border border-[var(--line)] rounded-[6px] px-2.5 text-xs text-[var(--t1)] focus:outline-none"
              >
                <option value="groq">Groq (Llama 3.3)</option>
                <option value="gemini">Google Gemini 2.0</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </div>

            <div>
              <label className="text-[11.5px] text-[var(--t2)] font-medium block mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full h-8 bg-[var(--s2)] border border-[var(--line)] rounded-[6px] px-2.5 text-xs text-[var(--t1)] focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="h-[28px] text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveKey}
              className="h-[28px] text-xs"
            >
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
