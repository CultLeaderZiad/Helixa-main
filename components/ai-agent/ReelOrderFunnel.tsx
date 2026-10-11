"use client"

import React from "react"
import { ArrowRight } from "lucide-react"

interface FunnelStep {
  label: string
  count: string
  percentage: string
  barWidth: string
}

const steps: FunnelStep[] = [
  { label: "Comments", count: "2,940", percentage: "100%", barWidth: "100%" },
  { label: "DM opened", count: "1,826", percentage: "62%", barWidth: "62%" },
  { label: "Lead captured", count: "612", percentage: "21%", barWidth: "21%" },
  { label: "Paid order", count: "148", percentage: "5%", barWidth: "5%" },
]

export function ReelOrderFunnel({ onFullInsights }: { onFullInsights?: () => void }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 select-none space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13.5px] font-semibold text-[var(--t1)] tracking-tight">
            Reel → order funnel
          </h3>
          <p className="text-[11px] text-[var(--t3)] font-mono mt-0.5">
            Last 7 days · all agents
          </p>
        </div>

        <button
          type="button"
          onClick={onFullInsights}
          className="text-[11.5px] font-medium text-[var(--t2)] hover:text-[var(--gold2)] flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Full insights</span>
          <ArrowRight className="w-3 h-3 text-[var(--t3)]" />
        </button>
      </div>

      {/* Funnel Steps */}
      <div className="space-y-3 pt-1">
        {steps.map((step) => (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-[var(--t2)] font-medium">{step.label}</span>
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span className="text-[var(--t1)] font-semibold">{step.count}</span>
                <span className="text-[var(--t3)] w-8 text-right">{step.percentage}</span>
              </div>
            </div>

            {/* Bar */}
            <div className="h-4 rounded-md bg-[var(--s2)] overflow-hidden">
              <div
                className="h-full rounded-md bg-gradient-to-r from-[var(--gold)] to-[var(--gold2)] opacity-85 transition-all duration-500"
                style={{ width: step.barWidth }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
