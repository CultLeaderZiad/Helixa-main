"use client"

import React, { useState } from "react"
import { Copy, Check, Upload, CreditCard, Wallet, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function PaymentMethodCard() {
  const [selectedMethod, setSelectedMethod] = useState<"vodafone" | "card" | "paymob">("vodafone")
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  const walletPhone = "010 ···· 2994"
  const transferRef = "HLX-7Q4M"

  const handleCopyPhone = () => {
    navigator.clipboard.writeText("01029940000")
    setCopiedPhone(true)
    toast.success("Vodafone Cash number copied to clipboard")
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  const handleCopyRef = () => {
    navigator.clipboard.writeText(transferRef)
    setCopiedRef(true)
    toast.success("Transfer reference copied to clipboard")
    setTimeout(() => setCopiedRef(false), 2000)
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-5 select-none space-y-4">
      {/* Header */}
      <h3 className="text-[14px] font-semibold text-[var(--t1)]">
        Payment method
      </h3>

      {/* 3 Provider Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Vodafone Cash */}
        <button
          type="button"
          onClick={() => setSelectedMethod("vodafone")}
          className={cn(
            "rounded-lg border p-2.5 text-left transition-colors cursor-pointer flex flex-col justify-between h-[68px]",
            selectedMethod === "vodafone"
              ? "border-[var(--line2)] bg-[var(--s2)] shadow-xs"
              : "border-[var(--line)] bg-[var(--s2)]/50 hover:bg-[var(--s2)] text-[var(--t3)]"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-[4px] bg-[#E60000] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              VF
            </span>
            <span className="font-semibold text-[11.5px] text-[var(--t1)] truncate">
              Vodafone Cash
            </span>
          </div>
          <span className="text-[10px] text-[var(--t3)] font-mono">Egypt · manual</span>
        </button>

        {/* Card (Stripe) */}
        <button
          type="button"
          onClick={() => setSelectedMethod("card")}
          className={cn(
            "rounded-lg border p-2.5 text-left transition-colors cursor-pointer flex flex-col justify-between h-[68px]",
            selectedMethod === "card"
              ? "border-[var(--line2)] bg-[var(--s2)] shadow-xs"
              : "border-[var(--line)] bg-[var(--s2)]/50 hover:bg-[var(--s2)] text-[var(--t3)]"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-[4px] bg-[#635BFF] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              S
            </span>
            <span className="font-semibold text-[11.5px] text-[var(--t1)] truncate">
              Card
            </span>
          </div>
          <span className="text-[10px] text-[var(--t3)] font-mono">Stripe · auto-renew</span>
        </button>

        {/* Paymob */}
        <button
          type="button"
          onClick={() => setSelectedMethod("paymob")}
          className={cn(
            "rounded-lg border p-2.5 text-left transition-colors cursor-pointer flex flex-col justify-between h-[68px]",
            selectedMethod === "paymob"
              ? "border-[var(--line2)] bg-[var(--s2)] shadow-xs"
              : "border-[var(--line)] bg-[var(--s2)]/50 hover:bg-[var(--s2)] text-[var(--t3)]"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-[4px] bg-[#0070F3] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              P
            </span>
            <span className="font-semibold text-[11.5px] text-[var(--t1)] truncate">
              Paymob
            </span>
          </div>
          <span className="text-[10px] text-[var(--t3)] font-mono">Wallets, cards</span>
        </button>
      </div>

      {/* Vodafone Cash Ticket Content */}
      {selectedMethod === "vodafone" && (
        <div className="space-y-3 pt-1">
          {/* Detail stats */}
          <div className="grid grid-cols-3 gap-2 py-1">
            {/* Amount */}
            <div>
              <span className="text-[10.5px] text-[var(--t3)] font-mono block mb-0.5">
                Send exactly
              </span>
              <span className="font-mono text-[13px] font-bold text-[var(--t1)] tabular-nums">
                EGP 15,700
              </span>
            </div>

            {/* Wallet Phone */}
            <div>
              <span className="text-[10.5px] text-[var(--t3)] font-mono block mb-0.5">
                To Vodafone Cash
              </span>
              <div className="flex items-center gap-1 font-mono text-[12px] text-[var(--t1)]">
                <span>{walletPhone}</span>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="text-[var(--t3)] hover:text-[var(--t1)] cursor-pointer"
                  title="Copy number"
                >
                  {copiedPhone ? (
                    <Check className="w-3 h-3 text-[var(--green)]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Reference */}
            <div>
              <span className="text-[10.5px] text-[var(--t3)] font-mono block mb-0.5">
                Reference
              </span>
              <div className="flex items-center gap-1 font-mono text-[12px] font-semibold text-[var(--gold2)]">
                <span>{transferRef}</span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="text-[var(--t3)] hover:text-[var(--t1)] cursor-pointer"
                  title="Copy reference"
                >
                  {copiedRef ? (
                    <Check className="w-3 h-3 text-[var(--green)]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Screenshot Dropzone */}
          <div
            onClick={() => toast.info("Upload transfer screenshot")}
            className="rounded-xl border border-dashed border-[var(--line2)] hover:border-[var(--line3)] bg-[var(--s2)]/40 hover:bg-[var(--s2)] p-3 text-center space-y-0.5 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-[var(--gold)] mx-auto mb-1" />
            <p className="text-[11.5px] font-medium text-[var(--t1)]">
              Drop the transfer screenshot here
            </p>
            <p className="text-[10px] text-[var(--t3)]">
              We match amount and reference automatically. No email or WhatsApp needed.
            </p>
          </div>

          {/* Stepper progress */}
          <div className="flex items-center justify-between text-[10.5px] font-mono text-[var(--t3)] pt-1">
            <span className="flex items-center gap-1 text-[var(--green)] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" /> Sent
            </span>
            <span className="h-px w-6 bg-[var(--line2)]" />
            <span className="flex items-center gap-1 text-[var(--amber)]">
              <span className="w-1.5 h-1.5 rounded-full border border-[var(--amber)]" /> Receipt uploaded
            </span>
            <span className="h-px w-6 bg-[var(--line2)]" />
            <span className="flex items-center gap-1 text-[var(--t4)]">
              <span className="w-1.5 h-1.5 rounded-full border border-[var(--line2)]" /> Verified
            </span>
            <span className="h-px w-6 bg-[var(--line2)]" />
            <span className="flex items-center gap-1 text-[var(--t4)]">
              <span className="w-1.5 h-1.5 rounded-full border border-[var(--line2)]" /> Active
            </span>
          </div>
        </div>
      )}

      {selectedMethod === "card" && (
        <div className="py-4 text-center space-y-2 text-xs text-[var(--t3)]">
          <CreditCard className="w-6 h-6 text-[var(--t3)] mx-auto" />
          <p>Credit & Debit cards are billed automatically each month via Stripe.</p>
        </div>
      )}

      {selectedMethod === "paymob" && (
        <div className="py-4 text-center space-y-2 text-xs text-[var(--t3)]">
          <Wallet className="w-6 h-6 text-[var(--t3)] mx-auto" />
          <p>Paymob accepts local Egyptian debit cards (Meeza) and electronic mobile wallets.</p>
        </div>
      )}
    </div>
  )
}
