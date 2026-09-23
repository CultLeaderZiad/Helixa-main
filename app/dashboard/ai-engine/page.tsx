"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Sparkles,
  Bot,
  BarChart3,
  Snowflake,
  Film,
  TrendingUp,
  MessageSquare,
  Zap,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Globe,
  Share2,
  Smile,
  Meh,
  Frown,
  Plus
} from "lucide-react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { AgentsManager } from "@/components/dashboard/AgentsManager"
import { AiCoachPanel } from "@/components/dashboard/AiCoachPanel"
import { IceBreakersManager } from "@/components/dashboard/IceBreakersManager"
import { AnalyticsDashboardView } from "@/components/dashboard/AnalyticsDashboardView"
import { ContentCardSkeleton } from "@/components/ui/DashboardSkeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import Link from "next/link"

type TabKey = "content" | "analytics" | "agents" | "coach" | "ice-breakers" | "insights"

function AiEngineContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get("tab") as TabKey) || "content"
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)

  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabKey
    if (tabParam && ["content", "analytics", "agents", "coach", "ice-breakers", "insights"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key)
    const params = new URLSearchParams(window.location.search)
    params.set("tab", key)
    router.replace(`/dashboard/ai-engine?${params.toString()}`, { scroll: false })
  }

  // Fetch real recent content
  const { data: contentData, isLoading: loadingContent, mutate: mutateContent } = useSWR("/api/ai/recent-content", fetcher)
  const posts = contentData?.posts || []

  // Fetch real growth insights
  const { data: insightsData, isLoading: loadingInsights, mutate: mutateInsights } = useSWR(
    activeTab === "insights" ? "/api/ai/growth-insights" : null,
    fetcher
  )

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#e5a93c]/10 text-[#e5a93c] text-[10px] font-mono-ui font-semibold border border-[#e5a93c]/25 tracking-wider uppercase">
              <Sparkles className="w-3 h-3" /> AI Engine Core
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono-ui font-medium border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live System
            </span>
          </div>
          <h1 className="font-serif-display text-3xl md:text-4xl text-white tracking-tight">
            AI Engine & Marketing Intelligence
          </h1>
          <p className="text-neutral-400 text-xs md:text-sm mt-1 max-w-2xl">
            Unified mission control: manage autonomous agents, track post-link targeting & sentiment, and analyze conversion funnels with 100% verified account data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/automations?action=new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e5a93c] hover:bg-[#d4952b] text-black font-semibold text-xs transition-all shadow-[0_0_20px_rgba(229,169,60,0.2)] font-mono-ui"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Target New Post Link
          </Link>
        </div>
      </div>

      {/* ─── Tab Navigation Bar ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-white/[0.06]">
        {[
          { key: "content" as const, label: "Recent Content", icon: Film, badge: posts.length > 0 ? posts.length : null },
          { key: "analytics" as const, label: "Analytics & Funnel", icon: BarChart3, badge: null },
          { key: "agents" as const, label: "AI Agents", icon: Bot, badge: null },
          { key: "coach" as const, label: "AI Coach", icon: Sparkles, badge: "New" },
          { key: "ice-breakers" as const, label: "Ice Breakers", icon: Snowflake, badge: null },
          { key: "insights" as const, label: "Growth Insights", icon: TrendingUp, badge: "Groq" },
        ].map(({ key, label, icon: Icon, badge }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#e5a93c]/15 text-[#e5a93c] border border-[#e5a93c]/30 shadow-[0_0_20px_rgba(229,169,60,0.12)]"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#e5a93c]" : "text-neutral-500"}`} />
              <span>{label}</span>
              {badge !== null && (
                <span
                  className={`text-[9px] font-mono-ui px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-[#e5a93c]/25 text-[#e5a93c]" : "bg-white/10 text-neutral-400"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ─── TAB 1: RECENT CONTENT ─── */}
      {activeTab === "content" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white font-mono-ui uppercase tracking-wider flex items-center gap-2">
                <span>Active Tracked Content</span>
                <span className="text-xs bg-white/10 text-neutral-300 px-2 py-0.5 rounded-full font-normal">
                  {posts.length} Posts
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Real Facebook & Instagram posts targeted via link resolution, showing live automation events and comment sentiment.
              </p>
            </div>

            <button
              onClick={() => mutateContent()}
              disabled={loadingContent}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all disabled:opacity-50 font-mono-ui"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingContent ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loadingContent ? (
            <div className="grid gap-6 md:grid-cols-2">
              <ContentCardSkeleton />
              <ContentCardSkeleton />
              <ContentCardSkeleton />
              <ContentCardSkeleton />
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon={Share2}
              badge="Targeting Engine"
              title="No Content Linked Yet"
              description="When you paste a Facebook or Instagram post link in your automation rules, it will appear here with live engagement tracking and Groq comment sentiment analysis."
              action={{
                label: "Create Targeted Rule",
                href: "/dashboard/automations?action=new",
              }}
              className="my-8"
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {posts.map((post: any) => {
                const s = post.sentiment
                const act = post.activity || { commentsReceived: 0, automationsTriggered: 0, repliesSent: 0 }
                const isFb = post.platform === "facebook"

                return (
                  <div
                    key={post.id || post.external_post_id}
                    className="border border-white/[0.08] bg-[#0c0a13]/80 backdrop-blur-sm rounded-2xl p-5 space-y-4 hover:border-white/20 transition-all shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      {/* Post Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono-ui ${
                              isFb
                                ? "bg-blue-600/15 text-blue-400 border border-blue-500/30"
                                : "bg-gradient-to-tr from-amber-500/20 via-rose-500/20 to-purple-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {isFb ? "FB" : "IG"}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-white leading-none">
                              {post.author_name || (isFb ? "Facebook Post" : "Instagram Reel")}
                            </p>
                            <p className="text-[10px] text-neutral-500 font-mono-ui mt-1">
                              ID: {post.external_post_id}
                            </p>
                          </div>
                        </div>

                        {post.permalink && (
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-neutral-500 hover:text-white transition-colors p-1"
                            title="Open original post"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      {/* Content Preview */}
                      <div className="flex gap-3 items-start bg-black/30 rounded-xl p-3 border border-white/5">
                        {post.thumbnail_url ? (
                          <img
                            src={post.thumbnail_url}
                            alt=""
                            className="w-14 h-14 rounded-lg object-cover bg-neutral-900 border border-white/10 shrink-0"
                          />
                        ) : null}
                        <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">
                          {post.caption || "No caption text recorded."}
                        </p>
                      </div>

                      {/* Real Activity Stats */}
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center font-mono-ui">
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <span className="text-[9px] uppercase tracking-wider text-neutral-500 block">Comments</span>
                          <span className="text-base font-bold text-white mt-0.5 block">{act.commentsReceived}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <span className="text-[9px] uppercase tracking-wider text-neutral-500 block">Triggered</span>
                          <span className="text-base font-bold text-[#e5a93c] mt-0.5 block">{act.automationsTriggered}</span>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5">
                          <span className="text-[9px] uppercase tracking-wider text-neutral-500 block">Replies</span>
                          <span className="text-base font-bold text-emerald-400 mt-0.5 block">{act.repliesSent}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sentiment Breakdown */}
                    <div className="pt-3 border-t border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono-ui">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#e5a93c]" />
                          Groq Comment Sentiment
                        </span>
                        {s?.hasData && (
                          <span className="text-[10px] text-neutral-400">
                            {s.total} {s.total === 1 ? "comment" : "comments"}
                          </span>
                        )}
                      </div>

                      {s?.hasData ? (
                        <div className="space-y-1.5">
                          {/* Segmented bar */}
                          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                            {s.positivePercent > 0 && (
                              <div
                                style={{ width: `${s.positivePercent}%` }}
                                className="h-full bg-emerald-400 transition-all"
                                title={`Positive: ${s.positivePercent}%`}
                              />
                            )}
                            {s.neutralPercent > 0 && (
                              <div
                                style={{ width: `${s.neutralPercent}%` }}
                                className="h-full bg-neutral-400 transition-all"
                                title={`Neutral: ${s.neutralPercent}%`}
                              />
                            )}
                            {s.negativePercent > 0 && (
                              <div
                                style={{ width: `${s.negativePercent}%` }}
                                className="h-full bg-rose-500 transition-all"
                                title={`Negative: ${s.negativePercent}%`}
                              />
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono-ui text-neutral-400 pt-0.5">
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Smile className="w-3 h-3" /> {s.positivePercent}% Positive
                            </span>
                            <span className="flex items-center gap-1 text-neutral-400">
                              <Meh className="w-3 h-3" /> {s.neutralPercent}% Neutral
                            </span>
                            <span className="flex items-center gap-1 text-rose-400">
                              <Frown className="w-3 h-3" /> {s.negativePercent}% Negative
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 px-3 rounded-lg bg-white/[0.02] border border-dashed border-white/5 text-center">
                          <p className="text-[11px] text-neutral-500 font-mono-ui">
                            No comments analyzed yet
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: ANALYTICS & FUNNEL ─── */}
      {activeTab === "analytics" && <AnalyticsDashboardView />}

      {/* ─── TAB 3: AI AGENTS ─── */}
      {activeTab === "agents" && <AgentsManager />}

      {/* ─── TAB 4: AI COACH (weekly digest, hook strength, niche) ─── */}
      {activeTab === "coach" && <AiCoachPanel />}

      {/* ─── TAB 5: ICE BREAKERS ─── */}
      {activeTab === "ice-breakers" && <IceBreakersManager />}

      {/* ─── TAB 5: GROWTH INSIGHTS ─── */}
      {activeTab === "insights" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white font-mono-ui uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#e5a93c]" />
                Account Growth Intelligence
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                AI advisor reasoning strictly over your account&apos;s real conversion, sentiment, and automation performance.
              </p>
            </div>

            <button
              onClick={() => mutateInsights()}
              disabled={loadingInsights}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all disabled:opacity-50 font-mono-ui"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingInsights ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>

          {loadingInsights ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#e5a93c]" />
              <span className="text-xs text-neutral-500 font-mono-ui">Analyzing real account data via Groq...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#0c0a13]/80 border border-white/[0.08] rounded-2xl p-4 font-mono-ui">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">Content Tracked</span>
                  <span className="text-2xl font-bold text-white mt-1 block">
                    {insightsData?.metrics?.totalPostsTracked || 0}
                  </span>
                </div>
                <div className="bg-[#0c0a13]/80 border border-white/[0.08] rounded-2xl p-4 font-mono-ui">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">Messages Delivered</span>
                  <span className="text-2xl font-bold text-[#e5a93c] mt-1 block">
                    {insightsData?.metrics?.totalMessages || 0}
                  </span>
                </div>
                <div className="bg-[#0c0a13]/80 border border-white/[0.08] rounded-2xl p-4 font-mono-ui">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">Conversations Started</span>
                  <span className="text-2xl font-bold text-blue-400 mt-1 block">
                    {insightsData?.metrics?.totalConvs || 0}
                  </span>
                </div>
                <div className="bg-[#0c0a13]/80 border border-white/[0.08] rounded-2xl p-4 font-mono-ui">
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">Sentiment Analyzed</span>
                  <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                    {insightsData?.metrics?.sentimentAnalyzed || 0}
                  </span>
                </div>
              </div>

              {/* AI Strategic Analysis Card */}
              <div className="bg-gradient-to-br from-[#e5a93c]/[0.05] via-[#0c0a13]/90 to-[#03010A] border border-[#e5a93c]/25 rounded-2xl p-6 md:p-8 space-y-4 backdrop-blur-md shadow-2xl">
                <div className="flex items-center gap-2 text-[#e5a93c]">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-mono-ui font-bold text-sm uppercase tracking-wider">
                    Performance Observations & Recommended Actions
                  </h3>
                </div>

                <div className="text-sm md:text-base text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans space-y-3">
                  {insightsData?.insights}
                </div>

                <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono-ui text-neutral-500">
                  <span>Source: Real Account Performance (No External Hallucinations)</span>
                  <span>Model: Groq Llama 3 / Mixtral</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AiEnginePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-[#e5a93c] animate-spin" />
        </div>
      }
    >
      <AiEngineContent />
    </Suspense>
  )
}
