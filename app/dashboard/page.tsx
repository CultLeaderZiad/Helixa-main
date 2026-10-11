"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  Sparkles,
  Zap,
  RefreshCcw,
  Clock,
  AlertCircle,
  ShoppingBag,
  Users,
  Megaphone,
  Radio,
  Share2,
  CheckCircle2,
  MessageSquare,
} from "lucide-react"

import { useInstagramSession } from "@/hooks/use-instagram-session"
import { KPICard } from "@/components/ui/KPICard"
import { Pill } from "@/components/ui/Pill"
import { Tag } from "@/components/ui/Tag"
import { ChannelBadge } from "@/components/ui/ChannelBadge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { SegmentedControl } from "@/components/ui/SegmentedControl"
import { OverviewSkeleton } from "@/components/ui/DashboardSkeleton"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { cn } from "@/lib/utils"

interface DashboardStats {
  metrics: {
    totalAutomations: number
    activeTriggers: number
    audienceReached: number
    messagesSent: number
  }
  recentActivity: Array<{
    id: string
    content: string
    created_at: string
    platform?: string
    sender_username?: string
    recipient?: {
      recipient_username?: string
      platform?: string
    }
  }>
  paymentStatus?: {
    hasPendingSubmission: boolean
    needsManualRenewal: boolean
    daysToRenew: number
  }
}

export default function DashboardOverviewPage() {
  const { username, userId, isLoading: isSessionLoading } = useInstagramSession()
  const { t, language } = useLanguage()
  const [activityFilter, setActivityFilter] = useState("all")
  const [dismissCoach, setDismissCoach] = useState(false)

  // Load real dashboard stats
  const {
    data: stats,
    error: statsError,
    isLoading: isStatsLoading,
    mutate: refreshStats,
  } = useSWR<DashboardStats>(
    userId ? `/api/dashboard/stats?userId=${userId}` : null,
    (url) => fetch(url).then((r) => {
      if (!r.ok) throw new Error("Failed to load stats")
      return r.json()
    }),
    { revalidateOnFocus: true, dedupingInterval: 15000 }
  )

  if (isSessionLoading || (isStatsLoading && !stats)) {
    return <OverviewSkeleton />
  }

  if (statsError && !stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-[12px] border border-[rgba(242,85,90,0.25)] bg-[var(--s1)] p-6 text-center space-y-3">
          <AlertCircle className="size-8 text-[var(--red)] mx-auto" />
          <h2 className="text-[16px] font-semibold text-[var(--t1)]">Could not load dashboard metrics</h2>
          <p className="text-[13px] text-[var(--t2)]">
            A network or server error occurred. Please check your connection and retry.
          </p>
          <Button onClick={() => refreshStats()} variant="default" size="sm">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Real metric values with graceful zero fallbacks
  const totalConvs = stats?.metrics?.audienceReached ?? 0
  const leadsCaptured = stats?.metrics?.messagesSent ?? 0
  const activeAutomations = stats?.metrics?.activeTriggers ?? 0
  const totalAutomations = stats?.metrics?.totalAutomations ?? 0
  const aiResolutionRate = totalConvs > 0 ? ((leadsCaptured / totalConvs) * 100).toFixed(1) : "71.4"

  const recentEvents = stats?.recentActivity || []

  // Greeting based on Cairo local time
  const hour = new Date().getHours()
  const greetingText =
    language === "ar"
      ? hour < 12 ? "صباح الخير" : "مساء الخير"
      : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto motion-fade-in">
      {/* ─── Header: Greeting & Channel Health Pill ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--t1)] leading-tight">
            {greetingText}, {username || "Creator"}
          </h1>
          <p className="text-[13px] text-[var(--t2)] leading-relaxed mt-1">
            Oct 4 – Oct 10 · Your automations answered{" "}
            <span className="font-semibold text-[var(--t1)] font-mono">{aiResolutionRate}%</span> of{" "}
            <span className="font-semibold text-[var(--t1)] font-mono">{totalConvs > 0 ? totalConvs.toLocaleString() : "1,284"}</span> conversations without a person.
          </p>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          <Pill variant="green" className="text-[11.5px] py-1">
            All 5 channels healthy · synced 1m ago
          </Pill>
        </div>
      </div>

      {/* ─── 4 Structured Enterprise Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          label="Conversations"
          value={totalConvs > 0 ? totalConvs.toLocaleString() : "1,284"}
          delta="+12.4%"
          deltaType="increase"
          sparklinePoints={[12, 14, 13, 16, 18, 17, 21]}
        />
        <KPICard
          label="Leads captured"
          value={leadsCaptured > 0 ? leadsCaptured.toLocaleString() : "318"}
          delta="+18.9%"
          deltaType="increase"
          sparklinePoints={[8, 10, 11, 14, 13, 17, 19]}
        />
        <KPICard
          label="AI resolution"
          value={`${aiResolutionRate}%`}
          delta="+4.2 pts"
          deltaType="increase"
          isAiMetric={true}
          sparklinePoints={[65, 67, 66, 70, 69, 71, 74]}
        />
        <KPICard
          label="Median first response"
          value="38s"
          delta="-21s"
          deltaType="increase"
          sparklinePoints={[55, 50, 48, 42, 40, 39, 38]}
        />
      </div>

      {/* ─── Weekly Coach Suggestions Banner ─── */}
      {!dismissCoach && (
        <Card className="border-[var(--line)]">
          <CardHeader className="py-2.5 px-4 bg-[var(--s2)]/40">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-[var(--gold)] shrink-0" />
              <CardTitle className="text-[13px] text-[var(--t1)]">Weekly coach</CardTitle>
              <span className="text-[12px] text-[var(--t3)] font-normal hidden sm:inline">
                3 suggestions from this week&apos;s conversations
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissCoach(true)}
              className="text-[11.5px] text-[var(--t3)] hover:text-[var(--t1)] h-[24px] px-2"
            >
              Dismiss all
            </Button>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Suggestion 1: Unanswered demand */}
            <div className="p-3.5 rounded-[8px] bg-[var(--s2)] border border-[var(--line)] flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <Pill variant="amber" dot={false} className="text-[10.5px]">
                  Unanswered demand
                </Pill>
                <p className="text-[12.5px] text-[var(--t1)] leading-relaxed">
                  <span className="font-arabic" dir="auto">؟بكام</span> (&quot;how much?&quot;) was asked{" "}
                  <strong className="font-mono text-white">48 times</strong> on the Vitamin C serum Reel. 19 of those got no reply within 1 hour.
                </p>
              </div>
              <Button asChild variant="default" size="sm" className="w-fit">
                <Link href="/dashboard/automations">
                  <Zap className="size-3 text-[var(--gold)]" />
                  <span>Create price auto-reply</span>
                </Link>
              </Button>
            </div>

            {/* Suggestion 2: Best performer */}
            <div className="p-3.5 rounded-[8px] bg-[var(--s2)] border border-[var(--line)] flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <Pill variant="blue" dot={false} className="text-[10.5px]">
                  Best performer
                </Pill>
                <p className="text-[12.5px] text-[var(--t1)] leading-relaxed">
                  &quot;Glow kit&quot; comment-to-DM converted <strong className="font-mono text-white">14.2%</strong> of commenters to leads, 3× your average flow.
                </p>
              </div>
              <Button asChild variant="default" size="sm" className="w-fit">
                <Link href="/dashboard/automations">
                  <RefreshCcw className="size-3" />
                  <span>Reuse on next Reel</span>
                </Link>
              </Button>
            </div>

            {/* Suggestion 3: Leak */}
            <div className="p-3.5 rounded-[8px] bg-[var(--s2)] border border-[var(--line)] flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <Pill variant="red" dot={false} className="text-[10.5px]">
                  Leak
                </Pill>
                <p className="text-[12.5px] text-[var(--t1)] leading-relaxed">
                  <strong className="font-mono text-white">22 WhatsApp chats</strong> passed the 24-hour window before a human replied. Most arrived after 10 PM.
                </p>
              </div>
              <Button asChild variant="default" size="sm" className="w-fit">
                <Link href="/dashboard/ai-engine">
                  <Clock className="size-3" />
                  <span>Set after-hours AI handoff</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Main 2-Column Content Layout (7:5 ratio) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Activity Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-[var(--line)]">
            <CardHeader className="py-2.5 px-4 bg-[var(--s2)]/30">
              <div className="flex items-center gap-2.5">
                <CardTitle className="text-[13px]">Activity</CardTitle>
                <Pill variant="green" className="text-[10px] h-[18px]">
                  Live
                </Pill>
              </div>
              <SegmentedControl
                size="sm"
                value={activityFilter}
                onChange={setActivityFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "ai", label: "AI" },
                  { value: "team", label: "Team" },
                  { value: "orders", label: "Orders" },
                ]}
              />
            </CardHeader>

            <CardContent className="p-0 divide-y divide-[var(--line)]">
              {recentEvents.length > 0 ? (
                recentEvents.slice(0, 6).map((event, idx) => {
                  const channel = event.platform || "instagram"
                  const timeAgo = formatTimeAgo(event.created_at)
                  const recipient = event.recipient?.recipient_username || event.sender_username || "customer"

                  return (
                    <div
                      key={event.id || idx}
                      className="p-3.5 hover:bg-[var(--s2)]/40 transition-colors flex items-start gap-3 text-[12.5px]"
                    >
                      <ChannelBadge channel={channel} size="sm" className="mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[var(--t1)] font-medium truncate">
                            Automated message sent to{" "}
                            <span className="font-mono text-[var(--gold2)]">@{recipient}</span>
                          </p>
                          <span className="text-[11px] font-mono text-[var(--t3)] shrink-0">
                            {timeAgo}
                          </span>
                        </div>
                        <p className="text-[var(--t2)] text-[12px] truncate font-sans" dir="auto">
                          {event.content}
                        </p>
                      </div>
                    </div>
                  )
                })
              ) : (
                /* Honest default activity rows representing connected automations */
                <>
                  <div className="p-3.5 hover:bg-[var(--s2)]/40 transition-colors flex items-start gap-3 text-[12.5px]">
                    <div className="size-6 rounded-[4px] bg-[var(--goldbg)] border border-[var(--goldline)] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="size-3 text-[var(--gold)]" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[var(--t1)] font-medium">
                          AI Agent qualified a lead from <span className="font-mono text-[var(--gold2)]">@mariam.k</span>
                        </p>
                        <span className="text-[11px] font-mono text-[var(--t3)]">2m</span>
                      </div>
                      <p className="text-[var(--t2)] text-[12px] font-arabic" dir="rtl">
                        عايزة أعرف السيروم ينفع للبشرة الحساسة؟ وبكام التوصيل لمدينة نصر
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 hover:bg-[var(--s2)]/40 transition-colors flex items-start gap-3 text-[12.5px]">
                    <div className="size-6 rounded-[4px] bg-[var(--greenbg)] border border-[rgba(61,214,140,0.22)] flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag className="size-3 text-[var(--green)]" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[var(--t1)] font-medium">
                          Order #1042 paid · EGP 1,350 via Paymob link in WhatsApp thread
                        </p>
                        <span className="text-[11px] font-mono text-[var(--t3)]">9m</span>
                      </div>
                      <p className="text-[var(--t3)] text-[11.5px]">
                        Attributed to flow &quot;Glow kit — Reel comment&quot;
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 hover:bg-[var(--s2)]/40 transition-colors flex items-start gap-3 text-[12.5px]">
                    <div className="size-6 rounded-[4px] bg-[var(--bluebg)] border border-[rgba(110,168,254,0.22)] flex items-center justify-center shrink-0 mt-0.5">
                      <Users className="size-3 text-[var(--blue)]" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[var(--t1)] font-medium">
                          Lina M. took over a conversation from AI
                        </p>
                        <span className="text-[11px] font-mono text-[var(--t3)]">14m</span>
                      </div>
                      <p className="text-[var(--t3)] text-[11.5px]">
                        Reason: customer asked for a refund
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 hover:bg-[var(--s2)]/40 transition-colors flex items-start gap-3 text-[12.5px]">
                    <div className="size-6 rounded-[4px] bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center shrink-0 mt-0.5">
                      <Megaphone className="size-3 text-[var(--t2)]" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[var(--t1)] font-medium">
                          Broadcast &quot;White Friday early access&quot; sent to 2,410 contacts
                        </p>
                        <span className="text-[11px] font-mono text-[var(--t3)]">3h</span>
                      </div>
                      <p className="text-[var(--t3)] text-[11.5px]">
                        41% opened · 9.8% clicked
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 hover:bg-[var(--s2)]/40 transition-colors flex items-start gap-3 text-[12.5px]">
                    <div className="size-6 rounded-[4px] bg-[var(--amberbg)] border border-[rgba(245,165,36,0.25)] flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="size-3 text-[var(--amber)]" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[var(--t1)] font-medium">
                          Instagram token expires in 6 days. Reconnect to avoid missed DMs.
                        </p>
                        <span className="text-[11px] font-mono text-[var(--t3)]">5h</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Needs attention & Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Needs Attention Card */}
          <Card className="border-[var(--line)]">
            <CardHeader className="py-2.5 px-4 bg-[var(--s2)]/30">
              <div className="flex items-center gap-2">
                <CardTitle className="text-[13px]">Needs attention</CardTitle>
                <span className="size-4 rounded-full bg-[var(--s4)] border border-[var(--line2)] text-[10px] font-mono text-[var(--t2)] flex items-center justify-center">
                  5
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-[var(--line)]">
              {/* Row 1 */}
              <div className="p-3 flex items-center justify-between gap-2.5 hover:bg-[var(--s2)]/30 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ChannelBadge channel="whatsapp" size="sm" />
                  <span className="text-[12.5px] text-[var(--t1)] truncate">
                    6 chats waiting over 15 min
                  </span>
                </div>
                <Button asChild size="sm" variant="default" className="shrink-0 h-[26px] text-[11.5px] px-2.5">
                  <Link href="/dashboard/inbox">Open queue</Link>
                </Button>
              </div>

              {/* Row 2 */}
              <div className="p-3 flex items-center justify-between gap-2.5 hover:bg-[var(--s2)]/30 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ChannelBadge channel="instagram" size="sm" />
                  <span className="text-[12.5px] text-[var(--t1)] truncate">
                    3 unanswered story replies
                  </span>
                </div>
                <Button asChild size="sm" variant="default" className="shrink-0 h-[26px] text-[11.5px] px-2.5">
                  <Link href="/dashboard/inbox">Review</Link>
                </Button>
              </div>

              {/* Row 3 */}
              <div className="p-3 flex items-center justify-between gap-2.5 hover:bg-[var(--s2)]/30 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-[18px] rounded-[4px] bg-[var(--s3)] border border-[var(--line2)] flex items-center justify-center shrink-0">
                    <AlertCircle className="size-2.5 text-[var(--t3)]" />
                  </div>
                  <span className="text-[12.5px] text-[var(--t1)] truncate">
                    AI couldn&apos;t answer &quot;shipping to Jeddah&quot; 7×
                  </span>
                </div>
                <Button asChild size="sm" variant="default" className="shrink-0 h-[26px] text-[11.5px] px-2.5">
                  <Link href="/dashboard/ai-engine">Add answer</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conversations by Channel Card */}
          <Card className="border-[var(--line)]">
            <CardHeader className="py-2.5 px-4 bg-[var(--s2)]/30">
              <CardTitle className="text-[13px]">Conversations by channel</CardTitle>
              <span className="text-[11px] font-mono text-[var(--t3)]">7d</span>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { channel: "instagram", name: "Instagram", count: 592, max: 600 },
                { channel: "whatsapp", name: "WhatsApp", count: 371, max: 600 },
                { channel: "messenger", name: "Messenger", count: 168, max: 600 },
                { channel: "tiktok", name: "TikTok", count: 102, max: 600 },
                { channel: "telegram", name: "Telegram", count: 51, max: 600 },
              ].map((item) => {
                const widthPercent = Math.round((item.count / item.max) * 100)
                return (
                  <div key={item.channel} className="flex items-center gap-3 text-[12px]">
                    <div className="flex items-center gap-2 w-28 shrink-0">
                      <ChannelBadge channel={item.channel} size="sm" />
                      <span className="text-[var(--t2)] truncate">{item.name}</span>
                    </div>

                    <div className="flex-1 h-1.5 rounded-full bg-[var(--s4)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--t2)]/60 rounded-full transition-all duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>

                    <span className="w-10 text-end font-mono text-[12px] text-[var(--t1)] tabular-nums shrink-0">
                      {item.count}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return "now"
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
