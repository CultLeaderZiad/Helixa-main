"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { Header } from "@/components/layout/Header"
import { Footer } from "@/components/layout/Footer"
import { FrontBackground } from "@/components/layout/FrontBackground"
import {
  MessageCircle, Sparkles, ArrowUpRight, Github, Star,
  Send, AtSign, Brain, Inbox, Lock, Terminal,
  Loader2, Linkedin, CheckCircle2, Zap, ShieldCheck
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Link from "next/link"

const TELEGRAM_URL = "https://t.me/cultleaderziad"
const GITHUB_URL = "https://github.com/CultLeaderZiad"
const LINKEDIN_URL = "https://www.linkedin.com/in/ziad-sabry-cl/"

export function LandingPage() {
  const [stars, setStars] = useState<number | null>(null)
  const router = useRouter()
  const { t, language } = useLanguage()
  const isAr = language === "ar"
  const [updatesContent, setUpdatesContent] = useState<string>("")
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(true)

  useEffect(() => {
    fetch("/api/settings/banner")
      .then(res => res.json())
      .then(data => {
        if (data && data.content) {
          setUpdatesContent(data.content)
        }
      })
      .catch(err => console.error("Failed to load updates", err))
      .finally(() => setIsLoadingUpdates(false))
  }, [])

  useEffect(() => {
    fetch("https://api.github.com/repos/CultLeaderZiad/insta-p8")
      .then(r => r.json())
      .then(d => { if (typeof d.stargazers_count === "number") setStars(d.stargazers_count) })
      .catch(() => {})
  }, [])

  const handleSignup = () => {
    router.push("/signup")
  }

  return (
    <div className="min-h-screen bg-[#03010A] text-[#ededed] selection:bg-[#ffe14d] selection:text-black overflow-x-hidden antialiased relative">
      {/* ─── Shape Grid & Ambient Background ─── */}
      <FrontBackground />
      <div className="grain-overlay" />

      {/* ─── Inline styles for CSS animations ─── */}
      <style>{`
        html { scroll-behavior: smooth; scroll-padding-top: 5rem; }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 24s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .marquee-track { animation: none; }
          .hero-fade { animation: none !important; opacity: 1 !important; transform: none !important; }
          .feature-card { transition: none !important; }
          .feature-card:hover { transform: none !important; }
          .cta-glow { animation: none !important; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-fade {
          animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,225,77,0.18), 0 0 40px rgba(255,225,77,0.08); }
          50%      { box-shadow: 0 0 32px rgba(255,225,77,0.35),  0 0 70px rgba(255,225,77,0.15); }
        }
        .cta-glow {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        .cta-glow:hover {
          animation: none;
          box-shadow: 0 0 36px rgba(255,225,77,0.5), 0 4px 20px rgba(0,0,0,0.4);
        }
        .grain-overlay {
          position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* ═══════════════════════════════════════════ HEADER ═══════════════════════════════════════════ */}
      <Header activeHref="/" />

      {/* ═══════════════════════════════════════════ HERO ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-transparent w-full pt-8 sm:pt-14 pb-16 md:pb-24">
        <div className="relative px-5 sm:px-8 md:px-10 max-w-5xl mx-auto text-center hero-fade">
          
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 mb-6 font-mono-ui text-xs text-neutral-300 shadow-xl backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#ffe14d] animate-pulse" />
            <span className="font-semibold text-white">{t.heroBadge1 || "Helix Auto DM 2.0"}</span>
            <span className="text-neutral-500">•</span>
            <span>{t.heroBadge2 || "Meta Graph API Certified Automation"}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#ffe14d]" />
          </div>

          {/* Headline */}
          <h1 className="font-serif-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08] max-w-4xl mx-auto">
            {t.heroTitle || "Turn Comments & DMs Into Revenue"}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffe14d] via-[#fff5a0] to-[#e5a800]">
              {t.heroTitleGradient || "on Autopilot."}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-neutral-300 text-base sm:text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mt-6">
            {t.heroSubtitleLong || "The open-source, self-hosted social automation engine. Automatically reply to Instagram & Facebook comments, deliver instant lead magnets, and route conversations through intelligent AI funnels."}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <button
              onClick={handleSignup}
              className="cta-glow group flex items-center gap-2.5 bg-[#ffe14d] text-black font-mono-ui text-sm font-extrabold px-8 py-4 rounded-full hover:scale-[1.03] active:scale-[0.98] transition-all"
            >
              <span>{t.heroCta || "Start Automating for Free"}</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            <Link
              href="/pricing"
              className="flex items-center gap-2 font-mono-ui text-sm font-bold text-neutral-200 border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/30 px-7 py-4 rounded-full transition-all"
            >
              <span>{t.viewPricing || "View Pricing"}</span>
            </Link>

            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 font-mono-ui text-sm text-neutral-300 border border-white/10 bg-black/40 hover:border-white/30 px-6 py-4 rounded-full transition-colors"
            >
              <Star className="w-4 h-4 text-[#ffe14d]" />
              <span>{t.star || "Star"}</span>
              {typeof stars === "number" && (
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[11px] font-bold text-white">
                  {stars}
                </span>
              )}
            </a>
          </div>

          {/* Trust points */}
          <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 sm:gap-x-8 pt-8 text-xs font-mono-ui text-neutral-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {t.noCreditCardReq || "No Credit Card Required"}
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ffe14d]" />
              {t.officialMetaApi || "Official Meta Graph API"}
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              {t.replyLatency || "0.3s Reply Latency"}
            </span>
          </div>

          {/* Interactive Automation Preview Card */}
          <div id="how" className="mt-14 max-w-4xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-b from-[#0e0e14]/90 to-[#06060a]/90 p-4 sm:p-6 shadow-2xl backdrop-blur-xl text-left relative overflow-hidden scroll-mt-24">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="font-mono-ui text-xs text-neutral-500 ml-2">live-funnel-simulator.ts</span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-ui text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Trigger
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Step 1: User Comment */}
              <div className="space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                <span className="font-mono-ui text-[10px] uppercase tracking-wider text-neutral-500 block">
                  {t.step1Title || "1. Public Instagram / Facebook Post"}
                </span>
                <div className="bg-[#121218] border border-white/10 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">@alex_creator</span>
                    <span className="text-[10px] font-mono-ui text-neutral-500">2m ago</span>
                  </div>
                  <p className="text-xs text-neutral-300">
                    {t.creatorComment || 'Just dropped our 2026 Social Automation Blueprint! Comment PLAYBOOK and I’ll DM you the free file.'}
                  </p>
                </div>

                {/* Inbound Comment */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
                    <span>@sarah_marketer</span>
                    <span className="text-[10px] font-mono-ui">{t.triggerMatched || "Trigger Matched"}</span>
                  </div>
                  <p className="text-xs text-white font-medium">{t.commentUser || '"PLAYBOOK please!"'}</p>
                </div>

                {/* Instant Public Reply */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-400 font-semibold">
                    <span>{t.publicReplyLabel || "Helix Auto DM (Public Reply)"}</span>
                    <span className="text-[10px] font-mono-ui">⚡ 0.2s</span>
                  </div>
                  <p className="text-neutral-200">
                    {t.publicReplyContent || '"Sent straight to your DMs, Sarah! Check your requests 🚀"'}
                  </p>
                </div>
              </div>

              {/* Step 2: Instant Private DM */}
              <div className="space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="font-mono-ui text-[10px] uppercase tracking-wider text-neutral-500 block mb-3">
                    {t.step2Title || "2. Instant Private DM & Lead Capture"}
                  </span>

                  <div className="bg-[#121218] border border-[#ffe14d]/30 rounded-xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#ffe14d] text-black flex items-center justify-center font-bold text-[10px]">
                        H
                      </div>
                      <span className="text-xs font-bold text-white">Helix Auto DM</span>
                      <span className="text-[9px] font-mono-ui text-[#ffe14d] border border-[#ffe14d]/30 px-1 rounded">{t.verifiedBot || "Verified Bot"}</span>
                    </div>

                    <p className="text-xs text-neutral-200 leading-relaxed">
                      {t.privateDmIntro || "Hey Sarah! Here is your download link for the 2026 Social Automation Blueprint:"}
                    </p>

                    <div className="space-y-2 pt-1">
                      <div className="w-full py-2 px-3 rounded-lg bg-[#ffe14d] text-black font-bold text-xs text-center flex items-center justify-center gap-1.5 shadow-md">
                        <span>{t.downloadBlueprint || "Download 2026 Blueprint (.PDF)"}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                      <div className="w-full py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs text-center">
                        {t.scheduleStrategyCall || "Schedule a Free Strategy Call"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] font-mono-ui text-neutral-400 flex items-center justify-between border-t border-white/5">
                  <span>{isAr ? "نتيجة التحويل: تم الحصول على العميل" : "Conversion Result: Lead Captured"}</span>
                  <span className="text-emerald-400">{isAr ? "الحالة: مكتملة" : "Status: Completed"}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════ MARQUEE ═══════════════════════════════════════════ */}
      <div className="border-y border-white/[0.06] py-5 overflow-hidden bg-white/[0.01]">
        <div className="marquee-track flex whitespace-nowrap font-mono-ui text-xs md:text-sm tracking-wide text-neutral-400">
          <span className="pr-6">
            {isAr
              ? "مسارات التعليق إلى الخاص ✦ استهداف روابط المنشورات ✦ مشغلات الكلمات المفتاحية ✦ تفاعلات القصص ✦ ردود الذكاء الاصطناعي ✦ صندوق وارد موحد ✦ رسائل الترحيب ✦ قفل المتابعة ✦ تحليل المشاعر ✦ "
              : "COMMENT → DM FUNNELS ✦ POST LINK TARGETING ✦ KEYWORD TRIGGERS ✦ STORY REACTIONS ✦ GROQ AI AUTO-REPLY ✦ LIVE INBOX ✦ ICE BREAKERS ✦ FOLLOW GATE ✦ POST SENTIMENT ANALYSIS ✦ "}
          </span>
          <span className="pr-6">
            {isAr
              ? "مسارات التعليق إلى الخاص ✦ استهداف روابط المنشورات ✦ مشغلات الكلمات المفتاحية ✦ تفاعلات القصص ✦ ردود الذكاء الاصطناعي ✦ صندوق وارد موحد ✦ رسائل الترحيب ✦ قفل المتابعة ✦ تحليل المشاعر ✦ "
              : "COMMENT → DM FUNNELS ✦ POST LINK TARGETING ✦ KEYWORD TRIGGERS ✦ STORY REACTIONS ✦ GROQ AI AUTO-REPLY ✦ LIVE INBOX ✦ ICE BREAKERS ✦ FOLLOW GATE ✦ POST SENTIMENT ANALYSIS ✦ "}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ FEATURES ═══════════════════════════════════════════ */}
      <section id="features" className="px-5 md:px-10 py-24 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-3 mb-12">
          <div>
            <span className="font-mono-ui text-xs uppercase tracking-[0.2em] text-[#ffe14d] font-semibold block mb-2">
              {isAr ? "القدرات والميزات" : "Capabilities"}
            </span>
            <h2 className="font-serif-display text-4xl md:text-5xl text-white">
              {t.featuresHeading || "Everything the paid tools do."}
            </h2>
          </div>
          <span className="font-mono-ui text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full w-fit">
            {isAr ? "باقة الاستضافة الذاتية 0$/شهر" : "$0/mo self-hosted tier"}
          </span>
        </div>

        <div className="feature-grid grid md:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
          <Feature
            icon={<MessageCircle className="w-5 h-5" />}
            title={isAr ? "مسارات التحويل من التعليق للخاص" : "Comment → DM Funnels"}
            desc={isAr ? "مشغلات الكلمات المفتاحية أو الرد على الجميع في أي منشور. اختر الرد في الخاص فقط، أو الرد العام فقط، أو كلاهما." : "Keyword or reply-all triggers on any post. Choose DM only, public reply only, or both — with your own rotating public replies."}
          />
          <Feature
            icon={<Send className="w-5 h-5" />}
            title={isAr ? "أتمتة الكلمات المفتاحية في الرسائل" : "DM Keyword Automation"}
            desc={isAr ? "رد تلقائي على الرسائل الخاصة بالنصوص والوسائط وبطاقات الروابط التفاعلية مع أزرار سريعة لتوجيه الزوار." : "Auto-respond to DMs with text, media, or rich cards with clickable buttons. Quick-reply chips guide visitors effortlessly."}
          />
          <Feature
            icon={<AtSign className="w-5 h-5" />}
            title={isAr ? "مشغلات تفاعلات القصص" : "Story Triggers"}
            desc={isAr ? "تفاعل فورياً مع الإشارات في القصص والتفاعلات بالرموز التعبيرية والردود، مع التصفية الذكية." : "React immediately to story mentions, emoji reactions, and story replies. Filter by emoji or specific keyword triggers."}
          />
          <Feature
            icon={<Brain className="w-5 h-5" />}
            title={isAr ? "محرك الذكاء الاصطناعي Groq" : "Groq AI Engine"}
            desc={isAr ? "زود الذكاء الاصطناعي بمعلومات حسابك ونبرة صوتك ومنتجاتك، ليفهم مشاعر الجمهور ويجيب كإنسان حقيقي." : "Feed it your real account context — niche, products, tone — and let AI classify sentiment and answer questions like a human."}
          />
          <Feature
            icon={<Inbox className="w-5 h-5" />}
            title={isAr ? "صندوق وارد حي موحد" : "Unified Live Inbox"}
            desc={isAr ? "جميع المحادثات عبر انستغرام وفيسبوك في لوحة تحكم واحدة فائقة السرعة مع إمكانية التدخل اليدوي." : "Every conversation across Instagram and Facebook Messenger in one clean dashboard. Jump in manually anytime."}
          />
          <Feature
            icon={<Lock className="w-5 h-5" />}
            title={isAr ? "قفل المتابعة لزيادة المتابعين" : "Follow Gate Conversion"}
            desc={isAr ? "اقفل الروابط الحصرية حتى يقوم المستخدم بالمتابعة. يتلقى غير المتابعين تذكيراً، ويتم الفتح فور المتابعة." : "Lock exclusive links and resources behind a follow. Non-followers get prompted, unlocking instantly upon following."}
          />
          <Feature
            icon={<Sparkles className="w-5 h-5" />}
            title={isAr ? "إرسال يحاكي السلوك البشري" : "Human-Like Sending"}
            desc={isAr ? "مؤشرات الكتابة وفترات التأخير العشوائية تضمن وصول ردودك بشكل طبيعي وموثوق، مما يحمي أمان حسابك." : "Typing indicators and randomized delay jitter ensure your replies land naturally, protecting account health."}
          />
          <Feature
            icon={<Terminal className="w-5 h-5" />}
            title={isAr ? "مستضاف ذاتياً ومجاني البداية" : "Self-Hosted & Free-Tier"}
            desc={isAr ? "مبني على Next.js و Supabase. انشر مجاناً، وامتلك كودك وبياناتك وتوكناتك بالكامل." : "Next.js + Supabase. Deploy on free tiers. Own every line of code, own your data, and own your API tokens."}
          />
          <div className="bg-[#0c0c12] p-8 flex flex-col items-center justify-center text-center space-y-2 border-b border-r border-white/[0.05]">
            <span className="text-xs font-mono-ui text-[#ffe14d] font-bold uppercase tracking-wider">
              ✦ {isAr ? "منصة هيليكسا أوتو دي إم" : "Helix Auto DM Platform"}
            </span>
            <p className="text-xs text-neutral-400 max-w-xs">
              {isAr ? "صُممت لصناع المحتوى المحترفين ووكالات التسويق ومطوري التطبيقات." : "Built for high volume creators, marketing agencies, and software developers."}
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ UPDATES ═══════════════════════════════════════════ */}
      <section id="updates" className="px-5 md:px-10 py-16 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-serif-display text-3xl md:text-4xl text-white">
              {isAr ? "آخر التحديثات" : "Latest Updates"}
            </h2>
            <p className="text-neutral-400 text-sm mt-1">
              {isAr ? "شاهد ما قمنا بتطويره وإطلاقه خلف الكواليس" : "See what we’ve been shipping behind the scenes"}
            </p>
          </div>
          <Link
            href="/updates"
            className="font-mono-ui text-xs font-bold text-[#ffe14d] hover:underline flex items-center gap-1"
          >
            <span>{isAr ? "عرض سجل التغيير" : "View Changelog"}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6 sm:p-10 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="prose prose-invert prose-yellow max-w-none font-mono text-sm leading-relaxed text-neutral-300">
            {isLoadingUpdates ? (
              <div className="flex items-center justify-center py-10 text-neutral-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> {isAr ? "جاري تحميل التحديثات..." : "Loading updates..."}
              </div>
            ) : updatesContent ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {updatesContent}
              </ReactMarkdown>
            ) : (
              <p className="text-neutral-500 text-center py-6">
                {isAr ? "لا توجد تحديثات منشورة حديثاً." : "No recent updates published."}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ OPEN SOURCE & COMMUNITY ═══════════════════════════════════════════ */}
      <section className="px-5 md:px-10 py-16 max-w-4xl mx-auto">
        <div className="bg-[#0b0b10] border border-white/10 rounded-2xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div>
            <h3 className="font-serif-display text-2xl md:text-3xl font-bold text-white mb-2">
              {isAr ? "صُنعت للجميع ومفتوحة المصدر." : "Built in the open."}
            </h3>
            <p className="text-neutral-400 text-sm max-w-md leading-relaxed">
              {isAr
                ? "النجوم والدعم والمختبرون يحافظون على ازدهار المنصة. لأي استفسارات أو ملاحظات أو ميزات جديدة — مجتمع تيليجرام متاح دائماً."
                : "Stars, sponsors, and testers keep this platform thriving. Questions, feedback, or feature requests — our Telegram community is open."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-[#2AABEE] text-white font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:brightness-110 transition-all shadow-md"
            >
              <Send className="w-3.5 h-3.5" /> {isAr ? "انضم إلى تيليجرام" : "Join Telegram"}
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border border-white/15 text-neutral-200 font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:border-white/40 transition-colors"
            >
              <Star className="w-3.5 h-3.5 text-[#ffe14d]" /> {isAr ? "نجمة على GitHub" : "Star on GitHub"}
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 border border-white/15 text-neutral-200 font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:border-white/40 transition-colors"
            >
              <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" /> LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ FOOTER ═══════════════════════════════════════════ */}
      <Footer />
    </div>
  )
}

/* ═══════════════════════════════════════════ FEATURE CARD ═══════════════════════════════════════════ */
function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="feature-card bg-[#03010A] p-7 sm:p-8 group hover:bg-[#0c0c14] transition-colors duration-200 border-b border-r border-white/[0.05] relative">
      <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-black group-hover:bg-[#ffe14d] group-hover:border-[#ffe14d] transition-all duration-200 mb-5">
        {icon}
      </div>
      <h3 className="font-mono-ui text-sm font-bold text-white mb-2 group-hover:text-[#ffe14d] transition-colors duration-200">
        {title}
      </h3>
      <p className="text-[13px] text-neutral-400 leading-relaxed group-hover:text-neutral-300 transition-colors duration-200">
        {desc}
      </p>
    </div>
  )
}

export default LandingPage
