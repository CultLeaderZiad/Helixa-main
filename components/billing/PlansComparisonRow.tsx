"use client"

import React, { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Pill } from "@/components/ui/Pill"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function PlansComparisonRow() {
  const [isAnnual, setIsAnnual] = useState(false)

  const plans = [
    {
      id: "creator",
      name: "Creator",
      price: isAnnual ? "EGP 575" : "EGP 690",
      isCurrent: false,
      features: [
        "1 brand · all social channels",
        "Catalog + payment links",
        "500 AI replies",
      ],
    },
    {
      id: "creator-pro",
      name: "Creator Pro",
      price: isAnnual ? "EGP 1,240" : "EGP 1,490",
      isCurrent: false,
      features: [
        "Adds WhatsApp + broadcasts",
        "3 seats · 3,000 AI replies",
        "Arabic dialect agent",
      ],
    },
    {
      id: "agency-starter",
      name: "Agency Starter",
      price: isAnnual ? "EGP 4,900" : "EGP 5,900",
      isCurrent: false,
      features: [
        "3 client workspaces",
        "Client portal + reports",
        "Shared seats",
      ],
    },
    {
      id: "agency-growth",
      name: "Agency Growth",
      price: isAnnual ? "EGP 9,900" : "EGP 11,900",
      isCurrent: true,
      features: [
        "10 workspaces · white-label",
        "8 seats · 12,000 AI replies",
        "Bring your own AI key",
      ],
    },
  ]

  return (
    <div className="space-y-4 select-none">
      {/* Header & Annual Toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--t1)]">Plans</h3>
          <p className="text-[11px] text-[var(--t3)]">
            Prices are placeholders pending validation
          </p>
        </div>

        {/* Monthly vs Annual Segment */}
        <div className="flex items-center p-0.5 rounded-[6px] bg-[var(--s2)] border border-[var(--line)] text-[11.5px]">
          <button
            type="button"
            onClick={() => setIsAnnual(false)}
            className={cn(
              "px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer",
              !isAnnual
                ? "bg-[var(--s3)] text-[var(--t1)]"
                : "text-[var(--t3)] hover:text-[var(--t2)]"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setIsAnnual(true)}
            className={cn(
              "px-2.5 py-1 rounded-[4px] font-medium transition-colors cursor-pointer",
              isAnnual
                ? "bg-[var(--s3)] text-[var(--t1)]"
                : "text-[var(--t3)] hover:text-[var(--t2)]"
            )}
          >
            Annual · 2 months free
          </button>
        </div>
      </div>

      {/* 4 Plan Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              "rounded-xl border p-4.5 flex flex-col justify-between space-y-4 transition-colors",
              p.isCurrent
                ? "border-[var(--line2)] bg-[var(--s2)] shadow-xs"
                : "border-[var(--line)] bg-[var(--s1)] hover:border-[var(--line2)]"
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[var(--t1)]">
                  {p.name}
                </span>
                {p.isCurrent && (
                  <Pill variant="gold" dot={false} className="text-[10px] h-4">
                    Current
                  </Pill>
                )}
              </div>

              <div>
                <span className="font-mono text-[18px] font-bold text-[var(--t1)] tabular-nums">
                  {p.price}
                </span>
                <span className="text-[11px] text-[var(--t3)] font-mono ml-1">
                  /mo
                </span>
              </div>

              {/* Features list */}
              <div className="space-y-1.5 text-[11.5px] text-[var(--t2)] pt-1">
                {p.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="text-[var(--t4)]">•</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              {p.isCurrent ? (
                <div className="h-[28px] rounded-[6px] border border-[var(--line)] bg-[var(--s3)] text-[var(--t2)] flex items-center justify-center text-[11.5px] font-medium">
                  Current plan
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toast.info(`Switching to ${p.name} plan`)}
                  className="w-full h-[28px] text-[11.5px] font-medium"
                >
                  Choose {p.name}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
