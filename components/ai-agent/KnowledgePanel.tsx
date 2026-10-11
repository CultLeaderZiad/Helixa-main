"use client"

import React, { useState } from "react"
import { Globe, Package, FileText, Upload, Plus, Check } from "lucide-react"
import { Pill } from "@/components/ui/Pill"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export function KnowledgePanel({ onAddSource }: { onAddSource?: () => void }) {
  const [sources, setSources] = useState([
    {
      id: "web-1",
      icon: Globe,
      name: "nourcosmetics.com · 38 pages",
      statusText: "synced 2h ago",
      pill: null,
    },
    {
      id: "cat-1",
      icon: Package,
      name: "Product catalog · 62 items",
      statusText: null,
      pill: <Pill variant="green" dot={false}>Synced</Pill>,
    },
    {
      id: "faq-1",
      icon: FileText,
      name: "FAQ (Arabic) · 41 answers",
      statusText: null,
      pill: <Pill variant="amber" dot={false}>7 gaps</Pill>,
    },
  ])

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 select-none space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[13.5px] font-semibold text-[var(--t1)] tracking-tight">
            Knowledge
          </h3>
          <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded-[4px] bg-[var(--s2)] text-[var(--t2)] border border-[var(--line)] leading-none">
            14 sources
          </span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (onAddSource) onAddSource()
            else toast.info("Enter website URL or upload document to add knowledge source")
          }}
          className="h-[26px] px-2 text-[11px] font-medium gap-1"
        >
          <Plus className="w-3 h-3 text-[var(--t3)]" />
          <span>Add</span>
        </Button>
      </div>

      {/* Source items */}
      <div className="space-y-2">
        {sources.map((src) => {
          const Icon = src.icon
          return (
            <div
              key={src.id}
              className="rounded-lg border border-[var(--line)] bg-[var(--s2)] p-2.5 flex items-center justify-between gap-3 hover:bg-[var(--s3)] transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="w-4 h-4 text-[var(--t3)] shrink-0" />
                <span className="text-[12px] text-[var(--t1)] font-medium truncate">
                  {src.name}
                </span>
              </div>

              <div className="shrink-0 text-right">
                {src.pill ? (
                  src.pill
                ) : (
                  <span className="font-mono text-[11px] text-[var(--t3)]">
                    {src.statusText}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Upload dropzone */}
      <div
        onClick={() => toast.info("Drag and drop file upload triggered")}
        className="rounded-xl border border-dashed border-[var(--line2)] hover:border-[var(--line3)] bg-[var(--s2)]/40 hover:bg-[var(--s2)] p-4 text-center space-y-1 transition-colors cursor-pointer"
      >
        <Upload className="w-4 h-4 text-[var(--t3)] mx-auto mb-1.5" />
        <p className="text-[12px] font-medium text-[var(--t1)]">
          Drop PDFs, price lists or chat exports
        </p>
        <p className="text-[10.5px] text-[var(--t3)] font-mono">
          Arabic and English · up to 20 MB
        </p>
      </div>
    </div>
  )
}
