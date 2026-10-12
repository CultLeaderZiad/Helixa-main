"use client"

import React, { useState, useRef } from "react"
import { Check, Upload, CreditCard, Wallet, ExternalLink, ArrowRight, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/ui/CopyButton"
import { brand } from "@/lib/brand"
import Link from "next/link"

export interface PaymentMethodCardProps {
  amount?: string
  currency?: "EGP" | "SAR" | "USD"
  currentPlanId?: string
  pendingReference?: string
}

export function PaymentMethodCard({
  amount = "EGP 15,700",
  currency = "EGP",
  currentPlanId = "agency",
  pendingReference,
}: PaymentMethodCardProps) {
  const [selectedMethod, setSelectedMethod] = useState<"vodafone" | "card" | "paymob">("vodafone")
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedReceipt, setUploadedReceipt] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Masked display: "010 •••• 2994"
  const rawNumber = brand.vodafoneCashNumber
  const maskedPhone = rawNumber.length >= 7
    ? `${rawNumber.slice(0, 3)} •••• ${rawNumber.slice(-4)}`
    : "010 •••• 2994"

  const transferRef = pendingReference || "HLX-7Q4M"

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setUploadedReceipt(file.name)
      toast.success(`Receipt "${file.name}" uploaded for verification`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setUploadedReceipt(file.name)
      toast.success(`Receipt "${file.name}" uploaded for verification`)
    }
  }

  const handleCardCheckout = async (provider: "stripe" | "paymob") => {
    setCheckoutLoading(true)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: currentPlanId,
          provider,
        }),
      })
      const data = await res.json()
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || "Unable to initiate payment session")
      }
    } catch {
      toast.error("Network error while creating checkout session")
    } finally {
      setCheckoutLoading(false)
    }
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
              ? "border-[var(--goldline)] bg-[var(--goldbg)]"
              : "border-[var(--line)] bg-[var(--s2)] hover:border-[var(--line2)] text-[var(--t3)]"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-7 h-7 rounded-[6px] bg-[#E60000] text-white flex items-center justify-center font-bold text-[11px] shrink-0"
              aria-label="Vodafone Cash Logo"
            >
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
              ? "border-[var(--goldline)] bg-[var(--goldbg)]"
              : "border-[var(--line)] bg-[var(--s2)] hover:border-[var(--line2)] text-[var(--t3)]"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-7 h-7 rounded-[6px] bg-[#635BFF] text-white flex items-center justify-center font-bold text-[11px] shrink-0"
              aria-label="Stripe Card Logo"
            >
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
              ? "border-[var(--goldline)] bg-[var(--goldbg)]"
              : "border-[var(--line)] bg-[var(--s2)] hover:border-[var(--line2)] text-[var(--t3)]"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="w-7 h-7 rounded-[6px] bg-[#0070F3] text-white flex items-center justify-center font-bold text-[11px] shrink-0"
              aria-label="Paymob Logo"
            >
              P
            </span>
            <span className="font-semibold text-[11.5px] text-[var(--t1)] truncate">
              Paymob
            </span>
          </div>
          <span className="text-[10px] text-[var(--t3)] font-mono">Wallets, cards</span>
        </button>
      </div>

      {/* Vodafone Cash Ticket (.ticket component) */}
      {selectedMethod === "vodafone" && (
        <div className="ticket rounded-xl border border-[var(--line)] bg-[var(--s2)] p-4 relative overflow-hidden space-y-3">
          {/* Top row, 3 columns */}
          <div className="grid grid-cols-3 gap-2 py-0.5">
            {/* Column 1: Send exactly */}
            <div>
              <span className="text-[10.5px] text-[var(--t3)] font-mono block mb-1">
                Send exactly
              </span>
              <span className="font-mono text-[13px] font-semibold text-[var(--t1)] tabular-nums">
                <bdi>{amount}</bdi>
              </span>
            </div>

            {/* Column 2: To Vodafone Cash */}
            <div>
              <span className="text-[10.5px] text-[var(--t3)] font-mono block mb-1">
                To Vodafone Cash
              </span>
              <div className="flex items-center gap-1 font-mono text-[13px] font-semibold text-[var(--t1)]">
                <bdi>{maskedPhone}</bdi>
                <CopyButton
                  value={brand.vodafoneCashNumber}
                  label="Vodafone Cash number"
                  className="p-1 h-auto"
                />
              </div>
            </div>

            {/* Column 3: Reference */}
            <div>
              <span className="text-[10.5px] text-[var(--t3)] font-mono block mb-1">
                Reference
              </span>
              <div className="flex items-center gap-1 font-mono text-[13px] font-semibold text-[var(--gold2)]">
                <bdi>{transferRef}</bdi>
                <CopyButton
                  value={transferRef}
                  label="Transfer reference"
                  className="p-1 h-auto text-[var(--gold2)]"
                />
              </div>
            </div>
          </div>

          {/* Perforated divider with half-circle notches */}
          <div className="relative my-2.5 flex items-center">
            {/* Left Notch */}
            <span
              className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--s1)] border-r border-[var(--line)]"
              aria-hidden="true"
            />
            {/* Dashed Perforation Line */}
            <div className="w-full border-t border-dashed border-[var(--line3)] mx-1" />
            {/* Right Notch */}
            <span
              className="absolute -right-[17px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--s1)] border-l border-[var(--line)]"
              aria-hidden="true"
            />
          </div>

          {/* Below perforation: Drop zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "rounded-xl border border-dashed p-3.5 text-center space-y-1 transition-colors cursor-pointer",
              isDragging
                ? "border-[var(--goldline)] bg-[var(--goldbg)]"
                : "border-[var(--line3)] bg-[var(--s2)] hover:border-[var(--goldline)] hover:bg-[var(--s3)]"
            )}
          >
            {uploadedReceipt ? (
              <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--green)]">
                <Check className="w-4 h-4" />
                <span className="font-medium truncate max-w-[260px]">{uploadedReceipt}</span>
                <span className="text-[10px] text-[var(--t3)]">(click to replace)</span>
              </div>
            ) : (
              <>
                <Upload className="w-4 h-4 text-[var(--gold)] mx-auto mb-1" />
                <p className="text-[11.5px] font-medium text-[var(--t1)]">
                  Drop the transfer screenshot here
                </p>
                <p className="text-[10.5px] text-[var(--t3)] leading-relaxed">
                  We match amount and reference automatically. No email or WhatsApp needed.
                </p>
              </>
            )}
          </div>

          {/* Status track: 4 steps */}
          <div className="flex items-center justify-between text-[10.5px] font-mono text-[var(--t3)] pt-1 px-1">
            {/* Step 1: Sent (Done = green check) */}
            <div className="flex items-center gap-1 text-[var(--green)] font-medium">
              <span className="w-3.5 h-3.5 rounded-full bg-[var(--greenbg)] border border-[var(--green)] flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-[var(--green)]" />
              </span>
              <span>Sent</span>
            </div>

            <span className="h-px w-6 sm:w-8 bg-[var(--line2)]" />

            {/* Step 2: Receipt uploaded (Current = gold ring) */}
            <div className="flex items-center gap-1 text-[var(--gold2)] font-medium">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--gold)] flex items-center justify-center shrink-0">
                <span className="w-1 h-1 rounded-full bg-[var(--gold)]" />
              </span>
              <span>Receipt uploaded</span>
            </div>

            <span className="h-px w-6 sm:w-8 bg-[var(--line2)]" />

            {/* Step 3: Verified (Upcoming = line3 ring) */}
            <div className="flex items-center gap-1 text-[var(--t3)]">
              <span className="w-3.5 h-3.5 rounded-full border border-[var(--line3)] shrink-0" />
              <span>Verified</span>
            </div>

            <span className="h-px w-6 sm:w-8 bg-[var(--line2)]" />

            {/* Step 4: Active (Upcoming = line3 ring) */}
            <div className="flex items-center gap-1 text-[var(--t3)]">
              <span className="w-3.5 h-3.5 rounded-full border border-[var(--line3)] shrink-0" />
              <span>Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Card (Stripe) Tab Content */}
      {selectedMethod === "card" && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-5 space-y-4">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-[var(--t3)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[12.5px] text-[var(--t1)] font-medium">
                Credit &amp; Debit cards
              </p>
              <p className="text-[11.5px] text-[var(--t3)] leading-relaxed">
                Cards are billed automatically each month via Stripe with secure 3D-Secure authentication.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              disabled={checkoutLoading}
              onClick={() => handleCardCheckout("stripe")}
              className="h-[32px] px-4 rounded-[6px] bg-[var(--t1)] text-black font-semibold text-[12px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <span>Pay {amount} by card</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <Link
              href="/privacy"
              className="text-[11px] text-[var(--t3)] hover:text-[var(--t2)] underline transition-colors"
            >
              Refund policy
            </Link>
          </div>
        </div>
      )}

      {/* Paymob Tab Content */}
      {selectedMethod === "paymob" && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--s2)] p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Wallet className="w-5 h-5 text-[var(--t3)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[12.5px] text-[var(--t1)] font-medium">
                Egyptian Wallets &amp; Local Cards
              </p>
              <p className="text-[11.5px] text-[var(--t3)] leading-relaxed">
                Paymob supports Meeza cards, mobile wallets (Vodafone, Orange, Etisalat, WE), and domestic Egyptian debit cards.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              disabled={checkoutLoading}
              onClick={() => handleCardCheckout("paymob")}
              className="h-[32px] px-4 rounded-[6px] bg-[var(--t1)] text-black font-semibold text-[12px] hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
            >
              <span>Pay {amount} with Paymob</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <Link
              href="/privacy"
              className="text-[11px] text-[var(--t3)] hover:text-[var(--t2)] underline transition-colors"
            >
              Refund policy
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
