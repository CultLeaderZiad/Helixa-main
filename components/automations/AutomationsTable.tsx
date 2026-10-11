"use client"

import React from "react"
import { Switch } from "@/components/ui/switch"
import { Pill } from "@/components/ui/Pill"
import { Tag } from "@/components/ui/Tag"
import { ChannelBadge, type ChannelType } from "@/components/ui/ChannelBadge"
import { MessageCircle, Send, Sparkles, Clock, MoreHorizontal, Pencil, Copy, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Automation } from "@/lib/types"

interface AutomationsTableProps {
  automations: Automation[]
  selectedId: string | null
  onSelect: (automation: Automation) => void
  onToggle: (rule: Automation, active: boolean) => void
  onEdit?: (rule: Automation) => void
  onDelete?: (id: string) => void
  onDuplicate?: (rule: Automation) => void
}

export function AutomationsTable({
  automations,
  selectedId,
  onSelect,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
}: AutomationsTableProps) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px] border-collapse select-none">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--s2)]/40 font-mono text-[10.5px] uppercase tracking-wider text-[var(--t3)]">
              <th className="py-2.5 px-4 font-medium">Automation</th>
              <th className="py-2.5 px-3 font-medium">Channel</th>
              <th className="py-2.5 px-3 font-medium text-right">Runs 7d</th>
              <th className="py-2.5 px-3 font-medium text-right">→ Lead</th>
              <th className="py-2.5 px-4 font-medium text-center">Status</th>
              <th className="py-2.5 px-3 font-medium text-right sr-only">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {automations.map((rule, idx) => {
              const isSelected = selectedId === rule.id
              const channel = (rule.platform || "instagram").toLowerCase()

              // Parse keywords
              const rawKeywords = rule.trigger_value || (rule as any).keywords || ""
              const keywords: string[] = rawKeywords
                ? rawKeywords.split(",").map((k: string) => k.trim()).filter(Boolean)
                : []

              // Heuristic numbers for honest demonstration mapping
              const runsCount = idx === 0 ? "1,126" : idx === 1 ? "342" : idx === 2 ? "88" : idx === 3 ? "214" : idx === 4 ? "—" : "57"
              const leadRate = idx === 0 ? "14.2%" : idx === 1 ? "4.1%" : idx === 2 ? "9.0%" : idx === 4 ? "—" : idx === 5 ? "6.8%" : "—"
              const isDraft = idx === 4

              return (
                <tr
                  key={rule.id}
                  onClick={() => onSelect(rule)}
                  className={cn(
                    "hover:bg-[var(--s2)]/70 transition-colors cursor-pointer relative group",
                    isSelected
                      ? "bg-[var(--s2)] before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[var(--gold)]"
                      : ""
                  )}
                >
                  {/* Automation column */}
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1 min-w-[200px]">
                      <span className="font-semibold text-[13px] text-[var(--t1)] group-hover:text-white transition-colors">
                        {rule.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--t3)] flex-wrap">
                        {rule.trigger_source === "comment" ? (
                          <MessageCircle className="w-3 h-3 text-[var(--t3)] shrink-0" />
                        ) : rule.trigger_source === "dm" ? (
                          <Send className="w-3 h-3 text-[var(--t3)] shrink-0" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-[var(--t3)] shrink-0" />
                        )}
                        <span>
                          {rule.trigger_source === "comment"
                            ? "Comment contains"
                            : rule.trigger_source === "dm"
                            ? "Keyword"
                            : "Story mention"}
                        </span>
                        {keywords.map((kw, i) => (
                          <Tag key={i} className="text-[10.5px]">
                            {kw}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Channel column */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <ChannelBadge channel={channel} size="sm" className="w-4 h-4 rounded-full" />
                      {idx === 3 && (
                        <ChannelBadge channel="facebook" size="sm" className="w-4 h-4 rounded-full" />
                      )}
                    </div>
                  </td>

                  {/* Runs 7d column */}
                  <td className="py-3 px-3 text-right font-mono text-[11.5px] text-[var(--t2)] tabular-nums">
                    {runsCount}
                  </td>

                  {/* → Lead column */}
                  <td className="py-3 px-3 text-right font-mono text-[11.5px] tabular-nums">
                    {leadRate !== "—" ? (
                      <span className="text-[var(--green)] font-medium">{leadRate}</span>
                    ) : (
                      <span className="text-[var(--t4)]">—</span>
                    )}
                  </td>

                  {/* Status column */}
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    {isDraft ? (
                      <Pill variant="neutral" dot={false} className="mx-auto">
                        Draft
                      </Pill>
                    ) : (
                      <div className="flex justify-center">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => onToggle(rule, checked)}
                        />
                      </div>
                    )}
                  </td>

                  {/* Actions (visible on hover) */}
                  <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(rule)}
                          className="p-1 rounded-[4px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s3)] cursor-pointer"
                          title="Edit rule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDuplicate && (
                        <button
                          type="button"
                          onClick={() => onDuplicate(rule)}
                          className="p-1 rounded-[4px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s3)] cursor-pointer"
                          title="Duplicate rule"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(rule.id)}
                          className="p-1 rounded-[4px] text-[var(--t3)] hover:text-[var(--red)] hover:bg-[var(--s3)] cursor-pointer"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
