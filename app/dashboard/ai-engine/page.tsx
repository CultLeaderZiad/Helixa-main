"use client"

import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Sparkles, Bot, Plus, Loader2, Play, BookOpen, BarChart3, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AiAgentCards } from "@/components/ai-agent/AiAgentCards"
import { ReelOrderFunnel } from "@/components/ai-agent/ReelOrderFunnel"
import { KnowledgePanel } from "@/components/ai-agent/KnowledgePanel"
import { ModelKeyPicker } from "@/components/ai-agent/ModelKeyPicker"
import { UnansweredQuestions } from "@/components/ai-agent/UnansweredQuestions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type TabKey = "agents" | "knowledge" | "insights" | "models"

function AiAgentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams?.get("tab") as TabKey) || "agents"
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

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

        {/* 4 Tabs Navigation */}
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
                  <span className="font-mono text-[10.5px] opacity-75">{tab.count}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab 1: Agents View */}
        {activeTab === "agents" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (Agents + Funnel, 7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <AiAgentCards />
                <ReelOrderFunnel onFullInsights={() => handleTabChange("insights")} />
              </div>

              {/* Right Column (Knowledge + Model, 5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <KnowledgePanel onAddSource={() => handleTabChange("knowledge")} />
                <ModelKeyPicker />
              </div>
            </div>

            {/* Bottom Row: Unanswered Questions */}
            <UnansweredQuestions />
          </div>
        )}

        {/* Tab 2: Knowledge View */}
        {activeTab === "knowledge" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <KnowledgePanel />
            <UnansweredQuestions />
          </div>
        )}

        {/* Tab 3: Insights View */}
        {activeTab === "insights" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ReelOrderFunnel />
            <div className="rounded-xl border border-[var(--line)] bg-[var(--s1)] p-6 text-center space-y-2">
              <BarChart3 className="w-8 h-8 text-[var(--t3)] mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-[var(--t1)]">
                Dialect & Sentiment Breakdown
              </h3>
              <p className="text-xs text-[var(--t3)] max-w-sm mx-auto">
                Egyptian (72%), Gulf (19%), MSA (9%). Resolution rate without human intervention is currently at 71.4%.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Model & keys View */}
        {activeTab === "models" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <ModelKeyPicker />
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
