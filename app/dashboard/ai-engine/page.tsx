"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Plus, Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AiAgentCards } from "@/components/ai-agent/AiAgentCards"
import { ReelOrderFunnel } from "@/components/ai-agent/ReelOrderFunnel"
import { KnowledgePanel } from "@/components/ai-agent/KnowledgePanel"
import { ModelKeyPicker } from "@/components/ai-agent/ModelKeyPicker"
import { UnansweredQuestions } from "@/components/ai-agent/UnansweredQuestions"
import { AnalyticsDashboardView } from "@/components/dashboard/AnalyticsDashboardView"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type TabKey = "agents" | "knowledge" | "insights" | "models"

function resolveTab(raw: string | null): TabKey {
  if (raw === "knowledge") return "knowledge"
  if (raw === "insights" || raw === "analytics") return "insights"
  if (raw === "models" || raw === "model-keys" || raw === "model" || raw === "byok") return "models"
  return "agents"
}

function AiAgentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get("tab")
  const [activeTab, setActiveTab] = useState<TabKey>(resolveTab(rawTab))

  // Redirect legacy bookmarks: coach -> /dashboard, content / ice-breakers -> /dashboard/automations
  useEffect(() => {
    const tab = searchParams?.get("tab")
    if (tab === "coach") {
      router.replace("/dashboard")
    } else if (tab === "content" || tab === "ice-breakers") {
      router.replace("/dashboard/automations")
    } else if (tab === "analytics") {
      handleTabChange("insights")
    } else if (tab === "model-keys" || tab === "model" || tab === "byok") {
      handleTabChange("models")
    } else if (tab && resolveTab(tab) !== activeTab) {
      setActiveTab(resolveTab(tab))
    }
  }, [searchParams])

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key)
    const params = new URLSearchParams(window.location.search)
    params.set("tab", key)
    router.replace(`/dashboard/ai-engine?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="min-h-[calc(100vh-52px)] bg-[var(--bg)] text-[var(--t1)] flex flex-col select-none">
      {/* Top Actions Bar */}
      <div className="h-[52px] border-b border-[var(--line)] px-6 flex items-center justify-between bg-[var(--s1)] shrink-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--t3)] font-medium">Nour Cosmetics</span>
          <span className="text-[12px] text-[var(--t4)]">/</span>
          <span className="text-[12px] text-[var(--t1)] font-semibold">AI Agent</span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => toast.info("Opening AI Playground simulator...")}
            className="h-[30px] px-3 text-[12px] font-medium gap-1.5"
          >
            <Play className="w-3.5 h-3.5 text-[var(--t3)] fill-current" />
            <span>Test in playground</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => toast.info("Configure new AI Agent")}
            className="h-[30px] px-3.5 text-[12px] font-medium gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New agent</span>
          </Button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--line2)]">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-[20px] font-bold text-[var(--t1)] tracking-tight">
            AI Agent
          </h1>
          <p className="text-[12.5px] text-[var(--t3)]">
            Agents answer DMs in the customer's dialect, using only this workspace's knowledge.
          </p>
        </div>

        {/* 4 Tabs Navigation: Agents · Knowledge · Insights · Model & keys */}
        <div className="flex items-center gap-1 border-b border-[var(--line)] pb-px">
          {[
            { id: "agents" as const, label: "Agents", count: "3" },
            { id: "knowledge" as const, label: "Knowledge", count: "14" },
            { id: "insights" as const, label: "Insights", count: null },
            { id: "models" as const, label: "Model & keys", count: null },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "h-[34px] px-3.5 text-[12.5px] font-medium transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-1.5",
                  isActive
                    ? "border-[var(--gold)] text-[var(--t1)] font-semibold"
                    : "border-transparent text-[var(--t3)] hover:text-[var(--t2)]"
                )}
              >
                <span>{tab.label}</span>
                {tab.count && (
                  <bdi className="font-mono text-[10.5px] opacity-75 tabular-nums">
                    {tab.count}
                  </bdi>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab 1: Agents View */}
        {activeTab === "agents" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 2-Column Grid ≈ 1.15fr / 1fr, gap 12 */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-3">
              {/* Left Column (Agents list + Reel funnel) */}
              <div className="space-y-3">
                <AiAgentCards />
                <ReelOrderFunnel onFullInsights={() => handleTabChange("insights")} />
              </div>

              {/* Right Column (Knowledge + Model) */}
              <div className="space-y-3">
                <KnowledgePanel
                  mode="summary"
                  onAddSource={() => handleTabChange("knowledge")}
                />
                <ModelKeyPicker
                  mode="summary"
                  onManageKeys={() => handleTabChange("models")}
                />
              </div>
            </div>

            {/* Bottom Row: Questions the agent couldn't answer */}
            <UnansweredQuestions />
          </div>
        )}

        {/* Tab 2: Knowledge View */}
        {activeTab === "knowledge" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <KnowledgePanel mode="full" />
            <UnansweredQuestions />
          </div>
        )}

        {/* Tab 3: Insights View */}
        {activeTab === "insights" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ReelOrderFunnel />
            <AnalyticsDashboardView />
          </div>
        )}

        {/* Tab 4: Model & keys View */}
        {activeTab === "models" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ModelKeyPicker mode="full" />
          </div>
        )}
      </div>
    </div>
  )
}

export default function AiEnginePage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-52px)] flex items-center justify-center bg-[var(--bg)]">
          <Loader2 className="w-7 h-7 text-[var(--t3)] animate-spin" />
        </div>
      }
    >
      <AiAgentContent />
    </Suspense>
  )
}
