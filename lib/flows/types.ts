import type { OutboundContent } from "@/lib/channels/types"

export const FLOW_NODE_TYPES = [
  "trigger",
  "send_message",
  "public_reply",
  "condition",
  "add_tag",
  "remove_tag",
  "set_field",
  "smart_delay",
  "ai_agent",
  "handoff",
  "webhook",
  "jump",
] as const

export type FlowNodeType = (typeof FLOW_NODE_TYPES)[number]

export const FLOW_TRIGGER_TYPES = [
  "keyword_dm",
  "comment",
  "story_reply",
  "story_mention",
  "story_reaction",
  "ice_breaker",
  "website_visitor",
  "tiktok_dm",
  "ref",
] as const

export type FlowTriggerType = (typeof FLOW_TRIGGER_TYPES)[number]

export interface FlowTrigger {
  type: FlowTriggerType
  channel?: string | null
  keywords?: string | null
  /** keyword (word match), exact, or reply_all (any message / any comment on the post). */
  match?: "keyword" | "exact" | "reply_all" | null
  mediaId?: string | null
  anyPost?: boolean
  iceBreakerId?: string | null
  question?: string | null
  refCode?: string | null
  reaction?: string | null
  /** Website visitor trigger fires only for a contact seen for the first time. */
  firstOnly?: boolean
}

export interface FlowNode {
  id: string
  type: FlowNodeType
  position: { x: number; y: number }
  data: Record<string, unknown>
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
}

export interface FlowGraph {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export type RunStatus = "active" | "waiting" | "completed" | "failed" | "paused" | "opted_out"

export type WaitKind = "delay" | "reply" | "button" | "ai"

export interface FlowRunState {
  id: string
  flowId: string
  versionId: string
  contactExternalId: string
  channel: string
  status: RunStatus
  currentNodeId: string | null
  waitKind: WaitKind | null
  resumeAt: number | null
  expectedPayloads: string[]
  stepToken: string
  steps: number
  context: Record<string, string>
}

export interface FlowContact {
  id?: string
  channel: string
  externalId: string
  tags: string[]
  customFields: Record<string, string>
  botPaused: boolean
  optedIn: boolean
  optedOut: boolean
  isFollower: boolean | null
  lastInboundAt: string | null
}

export type FlowSignalKind = "start" | "delay" | "button" | "reply" | "ai"

export interface FlowSignal {
  kind: FlowSignalKind
  eventId: string
  text?: string
  payload?: string
  aiReply?: string
  commentId?: string
  /** True only for the walk that starts from the inbound event itself. */
  inboundJustNow?: boolean
}

export interface SendEffect {
  type: "send"
  nodeId: string
  content: OutboundContent
  templateName?: string
  templateLanguage?: string
  messagingType?: "RESPONSE" | "MESSAGE_TAG"
  tag?: "HUMAN_AGENT"
}

export type FlowEffect =
  | SendEffect
  | { type: "public_reply"; nodeId: string; text: string; commentId?: string }
  | { type: "webhook"; nodeId: string; url: string; method: "GET" | "POST"; body: string }
  | { type: "schedule"; nodeId: string; resumeAt: number; stepToken: string }
  | { type: "stat"; nodeId: string; stat: "run" | "click" }
  | { type: "pause_bot"; nodeId: string }
  | { type: "ai"; nodeId: string; goal: string }
  | { type: "blocked"; nodeId: string; reason: string }

export interface EngineResult {
  run: FlowRunState
  contact: FlowContact
  effects: FlowEffect[]
  stale: boolean
  /** Pause or opt-out held the run. The caller reschedules instead of advancing. */
  hold: boolean
  retryAt: number | null
}

export const MAX_FLOW_STEPS = 32
