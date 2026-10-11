"use client"

import { useState, Suspense } from "react"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { CurrentPlanCard } from "@/components/billing/CurrentPlanCard"
import { PaymentMethodCard } from "@/components/billing/PaymentMethodCard"
import { PlansComparisonRow } from "@/components/billing/PlansComparisonRow"
import { RecentPaymentsTable } from "@/components/billing/RecentPaymentsTable"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function BillingPageContent() {
  const [selectedCurrency, setSelectedCurrency] = useState<"EGP" | "SAR" | "USD">("EGP")

  return (
    <div className="min-h-[calc(100vh-52px)] bg-[var(--bg)] text-[var(--t1)] flex flex-col select-none">
      {/* Top Actions Bar */}
      <div className="h-[52px] border-b border-[var(--line)] px-6 flex items-center justify-between bg-[var(--s1)] shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--t3)] font-medium">Mirage Digital</span>
          <span className="text-[12px] text-[var(--t4)]">/</span>
          <span className="text-[12px] text-[var(--t1)] font-semibold">Billing</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Currency Segmented Control */}
          <div className="flex items-center p-0.5 rounded-[6px] bg-[var(--s2)] border border-[var(--line)] text-[11px] font-mono">
            {(["EGP", "SAR", "USD"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => setSelectedCurrency(curr)}
                className={cn(
                  "px-2 py-0.5 rounded-[4px] font-medium transition-colors cursor-pointer",
                  selectedCurrency === curr
                    ? "bg-[var(--s3)] text-[var(--t1)]"
                    : "text-[var(--t3)] hover:text-[var(--t2)]"
                )}
              >
                {curr}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.info("Opening Invoices and payment receipts")}
            className="h-[30px] px-3 text-[12px] font-medium gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-[var(--t3)]" />
            <span>Invoices</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--line2)]">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-[20px] font-bold text-[var(--t1)] tracking-tight">
            Billing
          </h1>
          <p className="text-[12.5px] text-[var(--t3)]">
            One subscription for the agency. Pay by card or Vodafone Cash.
          </p>
        </div>

        {/* Top Grid: Current Plan & Payment Method */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CurrentPlanCard
            onChangePlan={() => toast.info("Select a plan below to upgrade or modify your subscription")}
            onAddWorkspaces={() => toast.info("Add extra workspace seats (EGP 950 / client)")}
            onCancelSubscription={() => toast.info("Cancellation scheduled")}
          />
          <PaymentMethodCard />
        </div>

        {/* Plans Comparison Row */}
        <PlansComparisonRow />

        {/* Recent Payments Table */}
        <RecentPaymentsTable />
      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-52px)] flex items-center justify-center bg-[var(--bg)]">
          <Loader2 className="w-7 h-7 text-[var(--t3)] animate-spin" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  )
}
