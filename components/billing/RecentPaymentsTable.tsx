"use client"

import React from "react"
import { Pill } from "@/components/ui/Pill"

interface PaymentRow {
  datePlan: string
  method: string
  reference: string
  statusPill: React.ReactNode
  amount: string
}

const payments: PaymentRow[] = [
  {
    datePlan: "Oct 1, 2026 · Agency Growth",
    method: "Vodafone Cash",
    reference: "HLX-3K8P",
    statusPill: <Pill variant="green" dot={false}>Verified in 2h</Pill>,
    amount: "EGP 15,700",
  },
  {
    datePlan: "Sep 1, 2026 · Agency Growth",
    method: "Card ·· 4242",
    reference: "in_109x...",
    statusPill: <Pill variant="green" dot={false}>Paid</Pill>,
    amount: "EGP 14,750",
  },
]

export function RecentPaymentsTable() {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] overflow-hidden select-none">
      <div className="p-4 border-b border-[var(--line)]">
        <h3 className="text-[13.5px] font-semibold text-[var(--t1)]">
          Recent payments
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--s2)]/30 font-mono text-[10.5px] uppercase tracking-wider text-[var(--t3)]">
              <th className="py-2.5 px-4 font-medium">Date & Plan</th>
              <th className="py-2.5 px-3 font-medium">Method</th>
              <th className="py-2.5 px-3 font-medium">Reference</th>
              <th className="py-2.5 px-3 font-medium">Status</th>
              <th className="py-2.5 px-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {payments.map((p, idx) => (
              <tr key={idx} className="hover:bg-[var(--s2)]/50 transition-colors">
                <td className="py-3 px-4 font-medium text-[var(--t1)]">
                  {p.datePlan}
                </td>
                <td className="py-3 px-3 text-[var(--t2)]">{p.method}</td>
                <td className="py-3 px-3 font-mono text-[11px] text-[var(--t3)]">
                  {p.reference}
                </td>
                <td className="py-3 px-3">{p.statusPill}</td>
                <td className="py-3 px-4 text-right font-mono text-[12.5px] font-semibold text-[var(--t1)] tabular-nums">
                  {p.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
