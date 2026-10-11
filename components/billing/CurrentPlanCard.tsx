"use client"

import React, { useState } from "react"
import { Pill } from "@/components/ui/Pill"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"

interface CurrentPlanCardProps {
  onAddWorkspaces?: () => void
  onChangePlan?: () => void
  onCancelSubscription?: () => void
}

export function CurrentPlanCard({
  onAddWorkspaces,
  onChangePlan,
  onCancelSubscription,
}: CurrentPlanCardProps) {
  const [cancelOpen, setCancelOpen] = useState(false)

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-5 select-none space-y-4 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-[var(--t1)]">
              Agency Growth
            </h3>
            <Pill variant="green" dot>
              Active
            </Pill>
          </div>
          <span className="font-mono text-[11px] text-[var(--t3)]">
            Renews Nov 1 · EGP 11,900 / mo
          </span>
        </div>

        {/* 3 Progress Bars */}
        <div className="space-y-3 pt-1">
          {/* Workspaces */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-[var(--t2)] font-medium">Client workspaces</span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--t1)]">
                14 / 10 · <span className="text-[var(--amber)]">4 extra</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--s3)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--amber)] w-full" />
            </div>
          </div>

          {/* AI Replies */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-[var(--t2)] font-medium">AI replies</span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--t1)]">
                8,240 / 12,000
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--s3)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--gold)] w-[68%]" />
            </div>
          </div>

          {/* Team Seats */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="text-[var(--t2)] font-medium">Team seats</span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--t1)]">
                6 / 8
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--s3)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--t2)] w-[75%]" />
            </div>
          </div>
        </div>

        {/* Next invoice breakdown */}
        <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-[11.5px]">
          <span className="text-[var(--t3)]">Next invoice</span>
          <span className="font-mono font-medium text-[var(--t1)] tabular-nums">
            EGP 11,900 + 4 × 950 ={" "}
            <strong className="text-[var(--gold2)] font-semibold">EGP 15,700</strong>
          </span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--line)]">
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onChangePlan}
            className="h-[28px] px-3 text-[11.5px] font-medium"
          >
            Change plan
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onAddWorkspaces}
            className="h-[28px] px-2.5 text-[11.5px] font-medium"
          >
            Add workspaces
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          className="text-[11.5px] text-[var(--t4)] hover:text-[var(--red)] transition-colors cursor-pointer"
        >
          Cancel subscription
        </button>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Agency Subscription?"
        description="Your client workspaces, AI automations, and white-label settings remain active until the end of your billing cycle on Nov 1."
        confirmLabel="Cancel Subscription"
        cancelLabel="Keep Subscription"
        variant="destructive"
        onConfirm={() => {
          if (onCancelSubscription) onCancelSubscription()
          else toast.info("Subscription cancellation scheduled at period end")
          setCancelOpen(false)
        }}
      />
    </div>
  )
}
