import type { Channel } from "@/lib/channels/types"
import type { FlowEdge, FlowGraph, FlowNode, FlowNodeType, FlowTrigger } from "@/lib/flows/types"
import { FLOW_NODE_TYPES, FLOW_TRIGGER_TYPES } from "@/lib/flows/types"

export interface ChannelCapabilities {
  text: boolean
  media: boolean
  buttons: boolean
  quickReplies: boolean
  publicReply: boolean
  templates: boolean
  maxButtons: number
}

const FULL: ChannelCapabilities = {
  text: true,
  media: true,
  buttons: true,
  quickReplies: true,
  publicReply: true,
  templates: false,
  maxButtons: 3,
}

export function channelCapabilities(channel: string): ChannelCapabilities {
  switch (channel) {
    case "instagram":
      return { ...FULL, maxButtons: 13 }
    case "messenger":
    case "facebook":
      return { ...FULL, maxButtons: 13 }
    case "whatsapp":
      return { ...FULL, publicReply: false, quickReplies: true, templates: true, maxButtons: 3 }
    case "telegram":
      return { ...FULL, publicReply: false, templates: false, maxButtons: 20 }
    case "tiktok":
      return {
        text: true,
        media: false,
        buttons: false,
        quickReplies: false,
        publicReply: false,
        templates: false,
        maxButtons: 0,
      }
    case "webchat":
    case "bio":
      return { ...FULL, publicReply: false, media: true, templates: false, maxButtons: 13 }
    default:
      return { ...FULL, publicReply: false }
  }
}

export function isFlowNodeType(value: unknown): value is FlowNodeType {
  return typeof value === "string" && (FLOW_NODE_TYPES as readonly string[]).includes(value)
}

export function isTriggerType(value: unknown): value is FlowTrigger["type"] {
  return typeof value === "string" && (FLOW_TRIGGER_TYPES as readonly string[]).includes(value)
}

const PRIVATE_HOST = /^(10\.|127\.|0\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|::1$|fc|fd|fe80)/i

/** https only, no credentials, no loopback or link-local hosts. */
export function isSafeWebhookUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== "https:") return false
  if (url.username || url.password) return false
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false
  if (host === "metadata.google.internal" || host === "169.254.169.254") return false
  if (PRIVATE_HOST.test(host)) return false
  return true
}

export function triggerFromGraph(graph: FlowGraph): FlowTrigger {
  const node = graph.nodes.find((item) => item.type === "trigger")
  const raw = node?.data?.trigger
  if (!raw || typeof raw !== "object") return { type: "keyword_dm", match: "keyword" }
  const trigger = raw as FlowTrigger
  if (!isTriggerType(trigger.type)) return { type: "keyword_dm", match: "keyword" }
  return trigger
}

export function findNode(graph: FlowGraph, id: string | null | undefined): FlowNode | null {
  if (!id) return null
  return graph.nodes.find((node) => node.id === id) || null
}

export function outgoing(graph: FlowGraph, nodeId: string, handle?: string | null): FlowEdge | null {
  const edges = graph.edges.filter((edge) => edge.source === nodeId)
  if (handle) {
    const exact = edges.find((edge) => (edge.sourceHandle || "default") === handle)
    if (exact) return exact
  }
  if (!handle || handle === "default") {
    return edges.find((edge) => !edge.sourceHandle || edge.sourceHandle === "default") || null
  }
  return null
}

export function validateGraph(graph: FlowGraph): string[] {
  const errors: string[] = []
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return ["Graph is missing nodes or edges"]
  }
  const triggers = graph.nodes.filter((node) => node.type === "trigger")
  if (triggers.length !== 1) errors.push("A flow needs exactly one trigger")
  const ids = new Set<string>()
  for (const node of graph.nodes) {
    if (!node.id) errors.push("A node is missing an id")
    if (ids.has(node.id)) errors.push(`Duplicate node id ${node.id}`)
    ids.add(node.id)
    if (!isFlowNodeType(node.type)) errors.push(`Unknown node type on ${node.id || "node"}`)
    if (node.type === "jump") {
      const target = String(node.data?.targetId || "")
      if (!target) errors.push(`Jump ${node.id} has no target`)
    }
    if (node.type === "webhook") {
      const url = String(node.data?.url || "")
      if (url && !isSafeWebhookUrl(url)) errors.push(`Webhook ${node.id} must be an https URL on a public host`)
    }
  }
  for (const edge of graph.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) errors.push(`Edge ${edge.id || ""} points at a missing node`)
  }
  for (const node of graph.nodes) {
    if (node.type !== "jump") continue
    const target = String(node.data?.targetId || "")
    if (target && !ids.has(target)) errors.push(`Jump ${node.id} points at a missing node`)
  }
  return errors
}

export function blankGraph(channel: Channel | string = "instagram"): FlowGraph {
  return {
    nodes: [
      {
        id: "trigger",
        type: "trigger",
        position: { x: 80, y: 80 },
        data: {
          trigger: { type: "keyword_dm", channel, match: "keyword", keywords: "" },
        },
      },
    ],
    edges: [],
  }
}

export function fillTemplate(text: string, contact: { channel: string; externalId: string; customFields: Record<string, string> }, context: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key: string) => {
    if (key.startsWith("field.")) return contact.customFields[key.slice(6)] || ""
    if (key === "channel") return contact.channel
    if (key === "external_id") return contact.externalId
    return context[key] || ""
  })
}
