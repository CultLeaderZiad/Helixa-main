"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { EmailPaymentIcon } from "@/components/icons/PaymentIcons"
import { Mail } from "lucide-react"

export interface PaymentOption {
  id: string
  name: string
  subline: string
  badgeText: string
  badgeColor?: string
  icon?: React.ReactNode
}

interface PaymentMethodListProps {
  selectedId: string
  onSelect: (id: string) => void
  options?: PaymentOption[]
  className?: string
}

const DEFAULT_METHODS: PaymentOption[] = [
  {
    id: "vodafone_cash",
    name: "Vodafone Cash",
    subline: "Mobile wallet · Instant transfer",
    badgeText: "VF",
    badgeColor: "bg-white text-black border border-[var(--line2)]",
  },
  {
    id: "email",
    name: "Email Payment Request",
    subline: "Invoice & instructions sent to email",
    badgeText: "EMAIL",
    badgeColor: "bg-[var(--goldbg)] text-[var(--gold)] border border-[var(--goldline)]",
  },
]

export function PaymentMethodList({
  selectedId,
  onSelect,
  options = DEFAULT_METHODS,
  className,
}: PaymentMethodListProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Payment method selection"
      className={cn("space-y-2 select-none", className)}
    >
      {options.map((item) => {
        const isSelected = selectedId === item.id

        return (
          <div
            key={item.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onSelect(item.id)
              }
            }}
            className={cn(
              "min-h-[56px] px-3.5 py-2.5 rounded-[10px] border transition-colors cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[var(--gold)]",
              isSelected
                ? "bg-[var(--s1)] border-[var(--line2)]"
                : "bg-[var(--s1)]/60 border-[var(--line)] hover:bg-[var(--s1)] hover:border-[var(--line2)]"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Radio Indicator */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                  isSelected
                    ? "border-[var(--gold)] bg-transparent"
                    : "border-[var(--line2)] bg-transparent"
                )}
                aria-hidden="true"
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--gold)]" />
                )}
              </div>

              {/* Badge */}
              <div
                className={cn(
                  "w-7 h-7 rounded-[6px] font-mono text-[10px] font-bold flex items-center justify-center shrink-0 overflow-hidden",
                  item.badgeColor || "bg-[var(--s3)] text-[var(--t1)]"
                )}
              >
                {item.id === "vodafone_cash" ? (
                  <img
                    src="/vodafone-cash.png"
                    alt="Vodafone Cash"
                    className="h-4 w-auto object-contain"
                  />
                ) : item.id === "email" ? (
                  <Mail className="w-3.5 h-3.5 text-[var(--gold)]" />
                ) : (
                  <span>{item.badgeText}</span>
                )}
              </div>

              {/* Text Info */}
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-[var(--t1)] leading-snug">
                  {item.name}
                </p>
                <p className="text-[11.5px] text-[var(--t3)] leading-tight mt-0.5">
                  {item.subline}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
