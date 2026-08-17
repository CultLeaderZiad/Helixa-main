"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import dynamic from "next/dynamic"
import TextPressure from "@/components/ui/text-pressure"
import { DeferredMount, InViewMount } from "@/components/ui/mount-lazy"
import DepthText from "@/components/ui/DepthText"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import PillNav from "@/components/ui/PillNav"
import { DashboardBackground } from "@/components/layout/DashboardBackground"
const ScrollFloat = dynamic(() => import("@/components/ui/ScrollFloat"), { ssr: false })
const MaskedHeading = dynamic(() => import("@/components/ui/MaskedHeading"), { ssr: false })
import CurvedLoop from "@/components/ui/CurvedLoop"
import CurvedInput from "@/components/ui/CurvedInput"
import {
  MessageCircle, Sparkles, ArrowUpRight, Github, Star,
  Send, AtSign, Brain, Inbox, Lock, Terminal,
  Loader2, Linkedin,
} from "lucide-react"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const TELEGRAM_URL = "https://t.me/cultleaderziad"
const GITHUB_URL = "https://github.com/CultLeaderZiad"
const LINKEDIN_URL = "https://www.linkedin.com/in/ziad-sabry-cl/"

export function LandingPage() {
  const [stars, setStars] = useState<number | null>(null)
  const router = useRouter()
  const { t } = useLanguage()
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

  const handleLogin = () => {
    router.push("/login")
  }

  const handleSignup = () => {
    router.push("/signup")
  }

  const handleTestLogin = () => {
    localStorage.setItem("ig_user_id", "9999999999")
    localStorage.setItem("ig_username", "test_creator")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-transparent text-[#ededed] selection:bg-[#ffe14d] selection:text-black overflow-x-hidden antialiased">
      <style>{`
        .font-serif-display { font-family: 'Instrument Serif', Georgia, serif; }
        .font-mono-ui { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 30s linear infinite; }
        @keyframes fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fade-up .7s cubic-bezier(.2,.7,.2,1) both; }
        .grain::before {
          content: ""; position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: .04;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>

      <DashboardBackground />
      <div className="grain" />

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-5 md:px-10 h-16 border-b border-white/[0.08]">
        <div className="flex items-center gap-2 md:gap-3 pointer-events-auto" style={{ position: 'relative', height: '40px', width: '120px' }}>
          <DepthText
            text="HELIXA"
            className=""
            layers={8}
            depth={1.5}
            faceColor="#ffe14d"
            depthColor="#a18110"
            tilt={5}
            perspective={600}
            autoOrbit={false}
            fontSize="24px"
            fontWeight={900}
            shadow={false}
          />
        </div>

        <div className="flex absolute left-1/2 -translate-x-1/2 items-center z-50">
          <PillNav
            items={[
              { label: "FEATURES", href: "#features" },
              { label: "PRICING", href: "/pricing" },
              { label: "UPDATES", href: "#updates" },
              { label: "START BUILD ->", href: "/signup" }
            ]}
            baseColor="rgba(255, 255, 255, 0.03)"
            pillColor="#ffe14d"
            hoveredPillTextColor="#ffffff"
            pillTextColor="#000000"
          />
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
        </div>
      </nav>

        {/* Hero — Split Layout */}
        <section className="relative overflow-hidden bg-transparent w-full">
          <div className="absolute inset-0 bg-gradient-to-t from-[#03010A] via-[#03010A]/80 to-[#03010A]/30 pointer-events-none" />

          <div className="relative px-5 md:px-10 pt-20 md:pt-32 pb-24 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-16">

              {/* Left — Helixa Logo */}
              <div className="hidden md:flex w-full md:w-1/2 flex-col justify-center pointer-events-none items-center">
                <div className="flex items-center justify-center relative overflow-visible group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#ffe14d]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full blur-3xl pointer-events-none" />
                  <DepthText
                    text="HELIXA"
                    layers={24}
                    depth={1.8}
                    faceColor="#ffe14d"
                    depthColor="#a18110"
                    tilt={7.5}
                    pointerTracking
                    perspective={900}
                    autoOrbit
                    orbitSpeed={0.35}
                    fontSize="clamp(6rem, 18vw, 12rem)"
                    fontWeight={900}
                    shadow
                    className="pointer-events-auto"
                  />
                </div>
              </div>

              {/* Right — Copy + CTAs */}
              <div className="fade-up w-full md:w-1/2 flex flex-col items-center md:items-end text-center md:text-right pointer-events-none" style={{ animationDelay: "120ms" }}>
                <div className="w-full max-w-[500px] mb-8 relative z-20">
                  <MaskedHeading
                    text={`${t.heroTitle1} ${t.heroTitle2}`}
                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
                    reveal="wipe"
                    trigger="view"
                    align="right"
                    className="font-serif-display"
                  />
                </div>

                <div className="space-y-4 mb-10">
                  <p className="text-neutral-300 text-base md:text-lg leading-relaxed max-w-lg">
                    {t.heroSubtitle}
                  </p>
                  <p className="text-neutral-500 text-sm md:text-base leading-relaxed max-w-lg">
                    {t.noCreditCard}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pointer-events-auto">
                  <button
                    onClick={handleSignup}
                    className="group flex items-center gap-2 bg-[#ffe14d] text-black font-mono-ui text-sm font-bold px-7 py-4 rounded-full hover:scale-[1.03] active:scale-[0.98] transition-transform"
                  >
                    <span className="relative z-10">{t.heroCta}</span>
                    <ArrowUpRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                  <a
                    href={TELEGRAM_URL} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 font-mono-ui text-sm text-neutral-300 border border-white/15 bg-black/60 backdrop-blur-md px-6 py-4 rounded-full hover:border-[#2AABEE]/60 hover:text-[#2AABEE] transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Telegram support
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="border-y border-white/[0.08] py-8 overflow-hidden bg-transparent">
          <CurvedLoop 
            marqueeText="COMMENT → DM ✦ KEYWORD TRIGGERS ✦ STORY REACTIONS ✦ AI AUTO-REPLY ✦ LIVE INBOX ✦ ICE BREAKERS ✦ FOLLOW GATE ✦ QUICK REPLIES ✦ MEDIA ATTACHMENTS ✦ PUBLIC + PRIVATE REPLIES ✦ "
            speed={3}
            curveAmount={300}
            direction="left"
            interactive={true}
            className="fill-neutral-500 font-mono-ui"
          />
        </div>

        {/* Feature grid */}
        <section id="features" className="px-5 md:px-10 py-20 max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="font-serif-display text-4xl md:text-5xl">Everything the paid tools do.</h2>
            <span className="hidden md:block font-mono-ui text-xs text-neutral-600">$0/month</span>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
            <Feature icon={<MessageCircle className="w-4 h-4" />} title="Comment → DM funnels"
              desc="Keyword or reply-all triggers on any post. Choose DM only, public reply only, or both — with your own rotating public replies." delay="0ms" />
            <Feature icon={<Send className="w-4 h-4" />} title="DM keyword automation"
              desc="Auto-respond to DMs with text, media, or rich cards with buttons. Quick-reply chips guide people through your funnel." delay="100ms" />
            <Feature icon={<AtSign className="w-4 h-4" />} title="Story triggers"
              desc="React to story mentions, emoji reactions, and story replies. Filter by emoji or keyword." delay="200ms" />
            <Feature icon={<Brain className="w-4 h-4" />} title="AI auto-reply"
              desc="Feed it your account context — niche, products, tone — and let AI handle unmatched DMs like a human." delay="300ms" />
            <Feature icon={<Inbox className="w-4 h-4" />} title="Live inbox"
              desc="Every conversation in one dashboard. Jump in manually anytime, fire quick responses from your saved automations." delay="400ms" />
            <Feature icon={<Lock className="w-4 h-4" />} title="Follow gate"
              desc="Lock content behind a follow. Non-followers get a follow prompt; one tap later they unlock the goods." delay="500ms" />
            <Feature icon={<Sparkles className="w-4 h-4" />} title="Human-like sending"
              desc="Optional typing indicators and randomized delays so replies land natural, not botty." delay="600ms" />
            <Feature icon={<Terminal className="w-4 h-4" />} title="Self-hosted & hackable"
              desc="Next.js + Supabase. Deploy on free tiers. Read every line, fork it, own your data and your tokens." delay="700ms" />
            <div className="bg-[#03010A] p-7 border-b border-r border-white/[0.05] hidden md:flex items-center justify-center text-center">
              <span className="text-xs font-mono text-neutral-600 uppercase tracking-wider">Helixa Enterprise Platform</span>
            </div>
          </div>
        </section>

        {/* ScrollFloat App Name */}
        <section id="how-it-works" className="py-24 md:py-32 w-full flex flex-col items-center justify-center overflow-hidden">
          <InViewMount>
            <ScrollFloat
              animationDuration={1}
              ease='back.inOut(2)'
              scrollStart='center bottom+=50%'
              scrollEnd='bottom bottom-=40%'
              stagger={0.03}
              containerClassName="w-full flex justify-center text-center mx-auto"
              textClassName="font-serif-display text-white tracking-widest uppercase text-center block mx-auto"
            >
              HELIXA
            </ScrollFloat>
          </InViewMount>
        </section>

        {/* Updates Section */}
        <section id="updates" className="px-5 md:px-10 py-16 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-serif-display text-4xl md:text-5xl mb-3 text-white">Latest Updates</h2>
            <p className="text-neutral-500 text-sm">See what we've been building behind the scenes</p>
          </div>
          
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/[0.01] via-transparent to-transparent pointer-events-none" />
            <div className="prose prose-invert prose-yellow max-w-none font-mono text-sm leading-relaxed text-neutral-300">
              {isLoadingUpdates ? (
                <div className="flex items-center justify-center py-12 text-neutral-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading updates...
                </div>
              ) : updatesContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {updatesContent}
                </ReactMarkdown>
              ) : (
                <p className="text-neutral-500 text-center py-6">No recent updates published.</p>
              )}
            </div>
          </div>
        </section>

        {/* Newsletter Subscription */}
        <section className="px-5 md:px-10 py-12 max-w-6xl mx-auto flex flex-col items-center text-center">
          <h3 className="font-serif-display text-2xl md:text-3xl mb-4">Get the latest updates</h3>
          <p className="text-neutral-500 text-sm mb-8 max-w-md">
            Join our newsletter to receive weekly updates, product news, and early access to new features.
          </p>
          <CurvedInput
            placeholder="yourname@xyz.com"
            buttonText="Get Started"
            theme="dark"
            bend={28}
            height={64}
            className="w-full max-w-md"
          />
        </section>

        {/* Community strip */}
        <section id="team" className="px-5 md:px-10 pb-24 max-w-6xl mx-auto">
          <div className="border border-white/[0.08] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-gradient-to-br from-white/[0.03] to-transparent">
            <div>
              <h3 className="font-serif-display text-3xl md:text-4xl mb-2">Built in the open.</h3>
              <p className="text-neutral-500 text-sm max-w-md">
                Stars, sponsors, and testers keep this project alive. Questions, bugs, feature requests —
                the Telegram chat is where it all happens.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={TELEGRAM_URL} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 bg-[#2AABEE] text-white font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:brightness-110 transition-all"
              >
                <Send className="w-3.5 h-3.5" /> Join Telegram
              </a>
              <a
                href={GITHUB_URL} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 border border-white/15 text-neutral-300 font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:border-white/40 transition-colors"
              >
                <Star className="w-3.5 h-3.5 text-[#ffe14d]" /> Star on GitHub
              </a>
              <a
                href={LINKEDIN_URL} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 border border-white/15 text-neutral-300 font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:border-white/40 transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" /> LinkedIn
              </a>
            </div>
          </div>
        </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] px-5 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-mono-ui text-[11px] text-neutral-600">
          Helixa — open-source Instagram automation. MIT licensed.
        </span>
        <div className="flex items-center gap-5 font-mono-ui text-[11px] text-neutral-500">
          <a href="/pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-white transition-colors">Terms</a>
          <span className="text-white/10">|</span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
          <a href={LINKEDIN_URL} target="_blank" rel="noreferrer" className="hover:text-[#0A66C2] transition-colors">LinkedIn</a>
          <a href={TELEGRAM_URL} target="_blank" rel="noreferrer" className="hover:text-[#2AABEE] transition-colors">Telegram support</a>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay?: string }) {
  return (
    <div 
      className="bg-[#03010A] p-7 group hover:bg-[#0d0a18]/70 hover:shadow-2xl hover:shadow-[#ffe14d]/5 hover:-translate-y-1 transition-all duration-300 ease-out border-b border-r border-white/[0.05] relative overflow-hidden"
      style={{ animationDelay: delay }}
    >
      {/* Dynamic highlight glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffe14d]/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon with scaling, rotation, and color transition */}
      <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-black group-hover:bg-[#ffe14d] group-hover:border-[#ffe14d] transition-all duration-300 transform group-hover:rotate-6 group-hover:scale-110 mb-6">
        {icon}
      </div>
      
      <h3 className="font-mono-ui text-sm font-bold text-white mb-2 group-hover:text-[#ffe14d] transition-colors duration-300 flex items-center gap-1">
        {title}
        <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-xs">→</span>
      </h3>
      <p className="text-[13px] text-neutral-500 leading-relaxed group-hover:text-neutral-400 transition-colors duration-300">{desc}</p>
    </div>
  )
}
