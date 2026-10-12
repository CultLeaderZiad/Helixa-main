"use client"

export { AiAgentCards as AgentsManager } from "@/components/ai-agent/AiAgentCards"
export default function LegacyAgentsManager() {
  const { AiAgentCards } = require("@/components/ai-agent/AiAgentCards")
  return <AiAgentCards />
}
