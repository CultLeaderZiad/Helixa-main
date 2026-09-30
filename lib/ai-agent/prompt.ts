import { replyInstruction, type DialectDetection } from "@/lib/ai-agent/dialect"
import type { AgentSettings } from "@/lib/ai-agent/guardrails"
import type { RetrievedChunk } from "@/lib/ai-agent/retrieve"

const TONE: Record<AgentSettings["tone"], string> = {
  friendly: "Warm and brief, like a helpful shop assistant.",
  professional: "Polite and precise. No slang beyond the customer's dialect.",
  concise: "One or two short sentences.",
}

export function buildAgentPrompt(input: {
  settings: AgentSettings
  detection: DialectDetection
  retrieved: RetrievedChunk[]
  goal?: string | null
}): string {
  const sources = input.retrieved.length
    ? input.retrieved.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join("\n\n")
    : "(no knowledge base passages matched)"
  return [
    `You are ${input.settings.personaName}, the assistant for this business.`,
    input.settings.persona,
    input.goal ? `Step goal: ${input.goal}` : "",
    TONE[input.settings.tone] || TONE.friendly,
    replyInstruction(input.detection),
    "Use only the knowledge base below for facts, prices, policies, and product details.",
    "Never invent a price, discount, or stock status that is not written in the knowledge base.",
    "If the question is outside the business, say you can only help with this business.",
    "If you are unsure, set handoff to true.",
    "If the customer shares a name, phone, email, city, or budget, copy them into fields.",
    "Reply with JSON only: {\"reply\":\"\",\"confidence\":0.0,\"handoff\":false,\"fields\":{},\"used_source_ids\":[]}",
    "confidence is a number from 0 to 1. used_source_ids lists the [n] passages you used.",
    "",
    "Knowledge base:",
    sources,
  ]
    .filter(Boolean)
    .join("\n")
}
