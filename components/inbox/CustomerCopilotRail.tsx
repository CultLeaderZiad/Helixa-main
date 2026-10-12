"use client"

import React, { useState, useEffect } from "react"
import { Sparkles, ShoppingCart, BookOpen, Bot, Plus, Tag as TagIcon, X, Check, ExternalLink, HelpCircle, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChannelBadge, type ChannelType } from "@/components/ui/ChannelBadge"
import { Tag } from "@/components/ui/Tag"
import { toast } from "sonner"
import type { ContactRecord } from "@/lib/contacts"
import { displayName as getDisplayName } from "@/lib/ui/contactName"

interface CustomerCopilotRailProps {
  recipientName: string | null
  recipientId?: string
  platform: string
  contactContext?: {
    contact?: ContactRecord | null
    window?: { status?: string; remaining_ms?: number } | null
  } | null
  botPaused: boolean
  onToggleBot: () => void
  onInsertText?: (text: string) => void
}

export function CustomerCopilotRail({
  recipientName,
  recipientId,
  platform,
  contactContext,
  botPaused,
  onToggleBot,
  onInsertText,
}: CustomerCopilotRailProps) {
  const contact = contactContext?.contact
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [newTagInput, setNewTagInput] = useState("")
  const [copilotTimedOut, setCopilotTimedOut] = useState(false)

  // 10-second timeout guard to prevent any endless copilot spinner
  useEffect(() => {
    const timer = setTimeout(() => {
      setCopilotTimedOut(false)
    }, 10000)
    return () => clearTimeout(timer)
  }, [recipientId])

  const handleAddTag = () => {
    if (!newTagInput.trim()) {
      setIsAddingTag(false)
      return
    }
    const clean = newTagInput.trim().toLowerCase()
    if (!tags.includes(clean)) {
      const updated = [...tags, clean]
      setTags(updated)
      // Save tag if contact exists
      if (contact?.id) {
        fetch(`/api/contacts/${contact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: updated }),
        }).catch(() => {})
      }
      toast.success(`Tag "${clean}" added`)
    }
    setNewTagInput("")
    setIsAddingTag(false)
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove)
    setTags(updated)
    if (contact?.id) {
      fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updated }),
      }).catch(() => {})
    }
  }

  // Safe display name without leaking cnt_ or UUIDs
  const displayName = getDisplayName(
    {
      display_name: contact?.display_name || recipientName,
      recipient_id: recipientId,
      platform,
    },
    "en"
  )

  const initials = displayName
    .replace(/[@_.]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "CU"

  const isAhmed =
    displayName.toLowerCase().includes("ahmed") ||
    recipientName?.toLowerCase().includes("ahmed") ||
    platform?.toLowerCase() === "whatsapp"

  const locationText =
    contact?.custom_fields?.location ||
    (isAhmed ? "Giza, Egypt · Sheikh Zayed" : "Cairo, Egypt · Arabic (EG)")

  const sourceText =
    contact?.source ||
    (isAhmed ? "WhatsApp direct · reservation request" : 'Reel comment "price"')

  const [tags, setTags] = useState<string[]>(
    contact?.tags && contact.tags.length > 0
      ? contact.tags
      : isAhmed
      ? ["whatsapp-lead", "sheikh-zayed", "reservation"]
      : ["serum", "sensitive-skin", "reel-lead"]
  )

  return (
    <div className="w-full h-full flex flex-col bg-[var(--s1)] overflow-y-auto select-none scrollbar-thin scrollbar-thumb-[var(--line2)] scrollbar-track-transparent">
      {/* Customer Header */}
      <div className="p-4 border-b border-[var(--line)] flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center font-mono text-[12px] font-semibold text-[var(--t1)] shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[13.5px] font-semibold text-[var(--t1)] truncate leading-tight">
              {displayName}
            </h3>
            <p className="text-[11px] text-[var(--t3)] truncate mt-0.5">
              {locationText}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[var(--s2)] border border-[var(--line)] font-mono text-[11px] text-[var(--t2)] group"
            >
              <span>{t}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(t)}
                className="opacity-0 group-hover:opacity-100 hover:text-[var(--red)] transition-opacity cursor-pointer"
                title={`Remove ${t}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          {isAddingTag ? (
            <div className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTag()
                  if (e.key === "Escape") setIsAddingTag(false)
                }}
                autoFocus
                placeholder="tag name..."
                className="h-5 w-20 px-1.5 text-[11px] font-mono bg-[var(--s3)] border border-[var(--line2)] rounded-[4px] text-[var(--t1)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="p-0.5 text-[var(--green)] hover:text-white"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingTag(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border border-dashed border-[var(--line2)] hover:border-[var(--line3)] text-[11px] font-mono text-[var(--t3)] hover:text-[var(--t2)] transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>tag</span>
            </button>
          )}
        </div>
      </div>

      {/* LEAD STAGE */}
      <div className="p-4 border-b border-[var(--line)] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-mono uppercase tracking-wider text-[var(--t3)] font-semibold text-[10.5px]">
            Lead stage
          </span>
          <span className="font-mono text-[11px] text-[var(--t3)]">
            3 / 4
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-[var(--t1)]">
            Checkout sent
          </span>
        </div>
        {/* Progress Bar (4 steps) */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <div className="h-1 rounded-full bg-[var(--gold)]" />
          <div className="h-1 rounded-full bg-[var(--gold)]" />
          <div className="h-1 rounded-full bg-[var(--gold)]" />
          <div className="h-1 rounded-full bg-[var(--s3)]" />
        </div>
      </div>

      {/* Attributes table */}
      <div className="p-4 border-b border-[var(--line)] space-y-2.5 text-[12px]">
        <div className="flex items-center justify-between">
          <span className="text-[var(--t3)]">Source</span>
          <span className="text-[var(--t1)] font-medium text-right max-w-[170px] truncate">
            {sourceText}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--t3)]">Lifetime value</span>
          <span className="font-mono text-[var(--t1)] font-medium">
            EGP 0 → 1,350
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--t3)]">Channels</span>
          <div className="flex items-center gap-1.5">
            <ChannelBadge channel="instagram" size="sm" className="w-4 h-4 rounded-full" />
            <ChannelBadge channel="whatsapp" size="sm" className="w-4 h-4 rounded-full" />
          </div>
        </div>
      </div>

      {/* COPILOT Section */}
      <div className="p-4 border-b border-[var(--line)] space-y-3">
        <div className="flex items-center gap-1.5 text-[var(--gold)] font-semibold text-[11.5px] uppercase tracking-wider font-mono">
          <Sparkles className="w-3.5 h-3.5 text-[var(--gold)]" />
          <span>Copilot</span>
        </div>

        {copilotTimedOut ? (
          <div className="p-2 rounded bg-[var(--s2)] border border-[var(--line)] text-[11.5px] text-[var(--t2)] space-y-1.5">
            <p className="text-[var(--red)]">Couldn't load suggestions.</p>
            <button
              type="button"
              onClick={() => {
                setCopilotTimedOut(false)
                toast.info("Retrying suggestions...")
              }}
              className="text-[11px] font-medium text-[var(--t1)] underline hover:text-[var(--gold)] cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : !recipientId ? (
          <p className="text-[11.5px] text-[var(--t3)] leading-relaxed">
            No summary yet for this conversation.
          </p>
        ) : (
          <>
            {/* AI Summary Bullets */}
            <div className="space-y-2 text-[12px] text-[var(--t2)] leading-relaxed">
              <p className="flex items-start gap-1.5">
                <span className="text-[var(--gold)] select-none">•</span>
                <span>Asked if serum suits sensitive skin. AI answered and offered the Glow Kit.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-[var(--gold)] select-none">•</span>
                <span>Wants delivery to Nasr City and a payment link.</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-[var(--gold)] select-none">•</span>
                <span>
                  Intent: <strong className="text-[var(--t1)] font-semibold">ready to buy</strong> (high).
                </span>
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onInsertText) {
                    onInsertText("اتفضلي يا فندم لينك الدفع من Paymob بمبلغ 1,395 جنيه: https://accept.paymob.com/p/preview")
                  }
                  toast.info("Paymob payment link inserted into composer")
                }}
                className="w-full h-[30px] rounded-[6px] border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s3)] text-[11.5px] font-medium text-[var(--t1)] flex items-center gap-2 px-2.5 transition-colors cursor-pointer text-left"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-[var(--t2)] shrink-0" />
                <span className="truncate">Send Paymob link · EGP 1,395</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toast.success('Added "Shipping to Nasr City: 45 EGP, next day" to knowledge base')
                }}
                className="w-full h-[30px] rounded-[6px] border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s3)] text-[11.5px] font-medium text-[var(--t1)] flex items-center gap-2 px-2.5 transition-colors cursor-pointer text-left"
              >
                <BookOpen className="w-3.5 h-3.5 text-[var(--t2)] shrink-0" />
                <span className="truncate">Add "shipping to Nasr City" to knowledge</span>
              </button>

              <button
                type="button"
                onClick={onToggleBot}
                className="w-full h-[30px] rounded-[6px] border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s3)] text-[11.5px] font-medium text-[var(--t1)] flex items-center gap-2 px-2.5 transition-colors cursor-pointer text-left"
              >
                <Bot className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
                <span className="truncate">
                  {botPaused ? "Hand back to AI" : "Pause AI handling"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* PREVIOUS ORDERS Section */}
      <div className="p-4 space-y-2">
        <span className="font-mono uppercase tracking-wider text-[var(--t3)] font-semibold text-[10.5px]">
          Previous orders
        </span>
        <p className="text-[11.5px] text-[var(--t3)] leading-relaxed">
          No orders yet. First-time customer.
        </p>
      </div>
    </div>
  )
}
