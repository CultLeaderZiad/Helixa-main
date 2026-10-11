"use client"

import React, { useState } from "react"
import { Bot, ShoppingCart, Star, MessageSquare } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Pill } from "@/components/ui/Pill"
import { ChannelBadge, type ChannelType } from "@/components/ui/ChannelBadge"
import { toast } from "sonner"

interface AgentItem {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  status: "live" | "paused"
  channels: ChannelType[]
  dialects: string
  scope: string
  isActive: boolean
  metrics: { label: string; value: string }[]
}

const initialAgents: AgentItem[] = [
  {
    id: "sales-assistant",
    name: "Sales assistant",
    icon: Bot,
    status: "live",
    channels: ["instagram", "whatsapp", "facebook"],
    dialects: "Egyptian · Gulf · English · Arabizi",
    scope: "Hands off on refunds, complaints",
    isActive: true,
    metrics: [
      { label: "Resolved alone", value: "71.4%" },
      { label: "Leads 7d", value: "318" },
      { label: "CSAT", value: "4.7 / 5" },
      { label: "Unknown answers", value: "7" },
    ],
  },
  {
    id: "order-tracker",
    name: "Order & delivery tracker",
    icon: ShoppingCart,
    status: "live",
    channels: ["whatsapp"],
    dialects: "",
    scope: 'Answers "where is my order" from Bosta tracking',
    isActive: true,
    metrics: [
      { label: "Answered 7d", value: "212" },
      { label: "No handoff", value: "96%" },
    ],
  },
  {
    id: "sentiment-watcher",
    name: "Comment sentiment watcher",
    icon: Star,
    status: "paused",
    channels: ["instagram"],
    dialects: "",
    scope: "Flags angry comments on tracked posts to the inbox",
    isActive: false,
    metrics: [],
  },
]

export function AiAgentCards() {
  const [agents, setAgents] = useState<AgentItem[]>(initialAgents)

  const handleToggle = (id: string, checked: boolean) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              isActive: checked,
              status: checked ? "live" : "paused",
            }
          : a
      )
    )
    toast.success(checked ? "Agent activated" : "Agent paused")
  }

  return (
    <div className="space-y-3 select-none">
      {agents.map((agent) => {
        const Icon = agent.icon
        return (
          <div
            key={agent.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-4 space-y-3.5 hover:border-[var(--line2)] transition-colors"
          >
            {/* Top row: Icon, Name, Status, Channels, Dialects, Toggle */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--s2)] border border-[var(--line)] flex items-center justify-center text-[var(--gold)] shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[13.5px] font-semibold text-[var(--t1)]">
                      {agent.name}
                    </h3>
                    {agent.status === "live" ? (
                      <Pill variant="green" dot>
                        Live
                      </Pill>
                    ) : (
                      <Pill variant="neutral" dot={false}>
                        Paused
                      </Pill>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11.5px] text-[var(--t3)]">
                    {/* Channel badges */}
                    <div className="flex items-center gap-1">
                      {agent.channels.map((ch) => (
                        <ChannelBadge key={ch} channel={ch} size="sm" className="w-4 h-4 rounded-full" />
                      ))}
                    </div>

                    {agent.dialects && (
                      <>
                        <span>{agent.dialects}</span>
                        <span>·</span>
                      </>
                    )}

                    <span>{agent.scope}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 pt-1">
                <Switch
                  checked={agent.isActive}
                  onCheckedChange={(checked) => handleToggle(agent.id, checked)}
                />
              </div>
            </div>

            {/* Metrics row */}
            {agent.metrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[var(--line)]">
                {agent.metrics.map((m) => (
                  <div key={m.label} className="text-left">
                    <div className="font-mono text-[13px] font-semibold text-[var(--t1)] tabular-nums">
                      {m.value}
                    </div>
                    <div className="text-[10.5px] text-[var(--t3)] font-mono">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
