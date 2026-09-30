"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

const ACCENT: Record<string, string> = {
  trigger: "#6366f1",
  public_reply: "#0ea5e9",
  send_message: "#ec4899",
  condition: "#f59e0b",
  add_tag: "#10b981",
  remove_tag: "#10b981",
  set_field: "#14b8a6",
  smart_delay: "#64748b",
  ai_agent: "#7c3aed",
  handoff: "#f97316",
  webhook: "#52525b",
  jump: "#d946ef",
}

const LABEL: Record<string, string> = {
  trigger: "Trigger",
  public_reply: "Public reply",
  send_message: "Send message",
  condition: "Condition",
  add_tag: "Add tag",
  remove_tag: "Remove tag",
  set_field: "Set field",
  smart_delay: "Smart delay",
  ai_agent: "AI agent",
  handoff: "Handoff",
  webhook: "Webhook",
  jump: "Jump",
}

export function FlowCard({ data }: NodeProps) {
  const kind = String(data.kind || "send_message")
  const accent = ACCENT[kind] || "#94a3b8"
  const runs = Number(data.runs || 0)
  const clicks = Number(data.clicks || 0)
  const buttons = Array.isArray(data.buttons) ? data.buttons : []
  const replies = Array.isArray(data.quickReplies) ? data.quickReplies : []
  const actions = [...buttons, ...replies].filter((item) => item && typeof item === "object")
  return (
    <div
      className="w-[240px] rounded-2xl bg-white text-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.08)] border border-slate-200/80"
      style={{ boxShadow: kind === "ai_agent" ? "0 0 0 2px #ddd6fe, 0 8px 30px rgba(124,58,237,0.12)" : undefined }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2.5 !h-2.5 !border-white" />
      <div className="px-3.5 pt-3 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
            {LABEL[kind] || kind}
          </span>
          {(runs > 0 || clicks > 0) && (
            <span className="text-[10px] text-slate-400 tabular-nums">{runs} runs{clicks ? ` · ${clicks} clicks` : ""}</span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] leading-snug font-medium text-slate-800 line-clamp-3">{String(data.summary || "Configure this step")}</p>
        {actions.length > 0 && (
          <div className="mt-2 space-y-1">
            {actions.slice(0, 3).map((item, index) => {
              const row = item as { title?: string; payload?: string }
              return (
                <div key={row.payload || index} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                  <span>{row.title}</span>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={String(row.payload || row.title || index)}
                    className="!bg-pink-300 !w-2 !h-2 !border-white !relative !transform-none !top-auto !right-auto"
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
      {kind === "condition" ? (
        <>
          <Handle type="source" position={Position.Bottom} id="yes" style={{ left: "30%" }} className="!bg-emerald-400 !w-2.5 !h-2.5 !border-white" />
          <Handle type="source" position={Position.Bottom} id="no" style={{ left: "70%" }} className="!bg-rose-400 !w-2.5 !h-2.5 !border-white" />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} id="default" className="!bg-slate-300 !w-2.5 !h-2.5 !border-white" />
      )}
    </div>
  )
}

export const flowNodeTypes = {
  trigger: FlowCard,
  public_reply: FlowCard,
  send_message: FlowCard,
  condition: FlowCard,
  add_tag: FlowCard,
  remove_tag: FlowCard,
  set_field: FlowCard,
  smart_delay: FlowCard,
  ai_agent: FlowCard,
  handoff: FlowCard,
  webhook: FlowCard,
  jump: FlowCard,
}

export function nodeSummary(type: string, data: Record<string, unknown>): string {
  const trigger = data.trigger as { type?: string; keywords?: string; mediaId?: string } | undefined
  if (type === "trigger") {
    if (trigger?.type === "comment") return trigger.mediaId ? `Comment “${trigger.keywords || "any"}” on a Reel` : `Comment “${trigger.keywords || "any"}” on any post`
    if (trigger?.type === "keyword_dm") return `DM contains “${trigger.keywords || "any"}”`
    if (trigger?.type === "tiktok_dm") return "TikTok DM"
    if (trigger?.type === "website_visitor") return "New website visitor"
    if (trigger?.type === "ice_breaker") return trigger.keywords || "Ice breaker"
    if (trigger?.type === "ref") return `Ref ${trigger.keywords || ""}`
    return trigger?.type || "Trigger"
  }
  if (type === "send_message") return String(data.text || data.templateName || "Message")
  if (type === "public_reply") return Array.isArray(data.variants) ? `${data.variants.length} variants` : "Public reply"
  if (type === "condition") return String(data.label || "Matches")
  if (type === "smart_delay") return `Wait ${Math.round(Number(data.delayMs || 0) / 60000) || 0}m`
  if (type === "add_tag" || type === "remove_tag") return Array.isArray(data.tags) ? data.tags.join(", ") : "Tag"
  if (type === "set_field") return data.key ? `${data.key} = ${data.value || ""}` : "Field"
  if (type === "ai_agent") return String(data.agentName || data.goal || "AI step")
  if (type === "handoff") return "Hand the chat to a person"
  if (type === "webhook") return String(data.url || "HTTPS request")
  if (type === "jump") return String(data.targetId || "Go to step")
  return type
}
