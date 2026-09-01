"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { HelixaLogo } from "@/components/ui/HelixaLogo"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import CurvedInput from "@/components/ui/CurvedInput"
import { PillNav } from "@/components/layout/PillNav"
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

  const handleSignup = () => {
    router.push("/signup")
  }

  // Parallax on HELIXA wordmark — lightweight scroll listener
  const heroRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let ticking = false
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (heroRef.current) {
            const y = window.scrollY
            heroRef.current.style.setProperty("--py", `${y * 0.35}px`)
          }
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#03010A] text-[#ededed] selection:bg-[#ffe14d] selection:text-black overflow-x-hidden antialiased">

      {/* ─── CSS-only ambient background ─── */}
      <div className="fixed inset-0 -z-10 pointer-events-none select-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(255,225,77,0.06)_0%,rgba(82,39,255,0.04)_40%,transparent_70%)]" />
        <div className="grain-overlay" />
      </div>

      {/* ─── Inline styles for CSS animations ─── */}
      <style>{`
        html { scroll-behavior: smooth; scroll-padding-top: 4rem; }
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 40s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          .marquee-track { animation: none; }
          .hero-fade { animation: none !important; opacity: 1 !important; transform: none !important; }
          .feature-card { transition: none !important; }
          .feature-card:hover { transform: none !important; }
          .pill-indicator { transition: none !important; }
          .cta-glow { animation: none !important; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-fade {
          animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hero-fade-delay {
          animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
        }
        .hero-fade-delay-2 {
          animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        /* Hero text clip reveal — premium left-to-right wipe */
        @keyframes clip-reveal {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0% 0 0); }
        }
        .hero-text-reveal {
          animation: clip-reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
        }
        .hero-text-reveal-accent {
          animation: clip-reveal 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
        }
        /* Feature grid stagger */
        .feature-grid .feature-card { opacity: 0; animation: fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .feature-grid .feature-card:nth-child(1) { animation-delay: 0ms; }
        .feature-grid .feature-card:nth-child(2) { animation-delay: 30ms; }
        .feature-grid .feature-card:nth-child(3) { animation-delay: 60ms; }
        .feature-grid .feature-card:nth-child(4) { animation-delay: 90ms; }
        .feature-grid .feature-card:nth-child(5) { animation-delay: 120ms; }
        .feature-grid .feature-card:nth-child(6) { animation-delay: 150ms; }
        .feature-grid .feature-card:nth-child(7) { animation-delay: 180ms; }
        .feature-grid .feature-card:nth-child(8) { animation-delay: 210ms; }
        .feature-grid .feature-card:nth-child(9) { animation-delay: 240ms; }
        /* Ensure hover still works after animation completes */
        .feature-grid .feature-card { animation-fill-mode: forwards; }
        /* CTA glow pulse */
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255,225,77,0.15), 0 0 40px rgba(255,225,77,0.05); }
          50%      { box-shadow: 0 0 28px rgba(255,225,77,0.3),  0 0 60px rgba(255,225,77,0.1); }
        }
        .cta-glow {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        .cta-glow:hover {
          animation: none;
          box-shadow: 0 0 32px rgba(255,225,77,0.4), 0 4px 16px rgba(0,0,0,0.3);
        }
        @media (prefers-reduced-motion: reduce) {
          .cta-glow { animation: none; }
        }
        .grain-overlay {
          position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* ═══════════════════════════════════════════ NAV ═══════════════════════════════════════════ */}
      <PillNav
        logo="/helix-logo.svg"
        logoAlt="Helixa Logo"
        items={[
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '/pricing' },
          { label: 'Updates', href: '#updates' },
          { label: 'Start Build', href: '/signup', isPrimary: true },
        ]}
        activeHref="/"
        baseColor="#0c0d0e"
        pillColor="#181a1b"
        hoverCircleColor="#ffe14d"
        hoveredPillTextColor="#000000"
        pillTextColor="#ffffff"
        sticky={true}
        stickyScrollThreshold={80}
        rightSlot={<LanguageSwitcher />}
      />

      {/* ═══════════════════════════════════════════ HERO ═══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-transparent w-full">
        <div className="relative px-5 md:px-10 pt-20 md:pt-32 pb-24 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-16">

            {/* Left — Clean HELIXA wordmark with parallax */}
            <div ref={heroRef} className="hidden md:flex w-full md:w-1/2 flex-col justify-center items-center hero-fade" style={{ transform: "translateY(calc(var(--py, 0px) * -1))", willChange: "transform" }}>
              <span
                className="font-serif-display font-black text-[clamp(6rem,18vw,12rem)] leading-[0.85] tracking-[-0.04em] text-[#ffe14d] select-none"
                style={{
                  textShadow: "0 2px 40px rgba(255,225,77,0.15), 0 60px 80px rgba(0,0,0,0.5)"
                }}
              >
                HELIXA
              </span>
            </div>

            {/* Right — Copy + CTAs */}
            <div className="w-full md:w-1/2 flex flex-col items-center md:items-end text-center md:text-right">
              <div className="w-full max-w-[500px] mb-8">
                <h1 className="font-serif-display text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
                  <span className="hero-text-reveal inline-block">{t.heroTitle1}{" "}</span>
                  <span className="text-[#ffe14d] hero-text-reveal-accent inline-block">{t.heroTitle2}</span>
                </h1>
              </div>

              <div className="space-y-4 mb-10 hero-fade-delay">
                <p className="text-neutral-300 text-base md:text-lg leading-relaxed max-w-lg">
                  {t.heroSubtitle}
                </p>
                <p className="text-neutral-500 text-sm md:text-base leading-relaxed max-w-lg">
                  {t.noCreditCard}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 hero-fade-delay-2">
                <button
                  onClick={handleSignup}
                  className="cta-glow group flex items-center gap-2 bg-[#ffe14d] text-black font-mono-ui text-sm font-bold px-7 py-4 rounded-full hover:scale-[1.03] active:scale-[0.98] transition-transform"
                >
                  <span>{t.heroCta}</span>
                  <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
                <a
                  href={TELEGRAM_URL} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 font-mono-ui text-sm text-neutral-300 border border-white/15 bg-black/40 px-6 py-4 rounded-full hover:border-[#2AABEE]/60 hover:text-[#2AABEE] transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Telegram support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ MARQUEE ═══════════════════════════════════════════ */}
      <div className="border-y border-white/[0.06] py-6 overflow-hidden bg-transparent">
        <div className="marquee-track flex whitespace-nowrap font-mono-ui text-sm tracking-wide fill-neutral-500">
          <span className="pr-4">
            COMMENT → DM ✦ KEYWORD TRIGGERS ✦ STORY REACTIONS ✦ AI AUTO-REPLY ✦ LIVE INBOX ✦ ICE BREAKERS ✦ FOLLOW GATE ✦ QUICK REPLIES ✦ MEDIA ATTACHMENTS ✦ PUBLIC + PRIVATE REPLIES ✦&nbsp;
          </span>
          <span className="pr-4">
            COMMENT → DM ✦ KEYWORD TRIGGERS ✦ STORY REACTIONS ✦ AI AUTO-REPLY ✦ LIVE INBOX ✦ ICE BREAKERS ✦ FOLLOW GATE ✦ QUICK REPLIES ✦ MEDIA ATTACHMENTS ✦ PUBLIC + PRIVATE REPLIES ✦&nbsp;
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ FEATURES ═══════════════════════════════════════════ */}
      <section id="features" className="px-5 md:px-10 py-20 max-w-6xl mx-auto">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="font-serif-display text-4xl md:text-5xl">Everything the paid tools do.</h2>
          <span className="hidden md:block font-mono-ui text-xs text-neutral-600">$0/month</span>
        </div>

        <div className="feature-grid grid md:grid-cols-3 gap-px bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
          <Feature icon={<MessageCircle className="w-4 h-4" />} title="Comment → DM funnels"
            desc="Keyword or reply-all triggers on any post. Choose DM only, public reply only, or both — with your own rotating public replies." />
          <Feature icon={<Send className="w-4 h-4" />} title="DM keyword automation"
            desc="Auto-respond to DMs with text, media, or rich cards with buttons. Quick-reply chips guide people through your funnel." />
          <Feature icon={<AtSign className="w-4 h-4" />} title="Story triggers"
            desc="React to story mentions, emoji reactions, and story replies. Filter by emoji or keyword." />
          <Feature icon={<Brain className="w-4 h-4" />} title="AI auto-reply"
            desc="Feed it your account context — niche, products, tone — and let AI handle unmatched DMs like a human." />
          <Feature icon={<Inbox className="w-4 h-4" />} title="Live inbox"
            desc="Every conversation in one dashboard. Jump in manually anytime, fire quick responses from your saved automations." />
          <Feature icon={<Lock className="w-4 h-4" />} title="Follow gate"
            desc="Lock content behind a follow. Non-followers get a follow prompt; one tap later they unlock the goods." />
          <Feature icon={<Sparkles className="w-4 h-4" />} title="Human-like sending"
            desc="Optional typing indicators and randomized delays so replies land natural, not botty." />
          <Feature icon={<Terminal className="w-4 h-4" />} title="Self-hosted & hackable"
            desc="Next.js + Supabase. Deploy on free tiers. Read every line, fork it, own your data and your tokens." />
          <div className="bg-[#03010A] p-7 border-b border-r border-white/[0.05] hidden md:flex items-center justify-center text-center">
            <span className="text-xs font-mono text-neutral-600 uppercase tracking-wider">Helixa Enterprise Platform</span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════ SCROLLTEXT ═══════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 md:py-32 w-full flex items-center justify-center overflow-hidden">
        <span className="font-serif-display text-white/10 tracking-[0.2em] uppercase text-[clamp(3rem,12vw,10rem)] font-black select-none pointer-events-none">
          HELIXA
        </span>
      </section>

      {/* ═══════════════════════════════════════════ UPDATES ═══════════════════════════════════════════ */}
      <section id="updates" className="px-5 md:px-10 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-serif-display text-4xl md:text-5xl mb-3 text-white">Latest Updates</h2>
          <p className="text-neutral-500 text-sm">See what we've been building behind the scenes</p>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-8 md:p-12 relative overflow-hidden">
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

      {/* ═══════════════════════════════════════════ NEWSLETTER ═══════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════ COMMUNITY ═══════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════ FOOTER ═══════════════════════════════════════════ */}
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

/* ═══════════════════════════════════════════ FEATURE CARD ═══════════════════════════════════════════ */
function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="feature-card bg-[#03010A] p-7 group hover:bg-[#0a0a12] transition-colors duration-200 border-b border-r border-white/[0.05] relative">
      <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-black group-hover:bg-[#ffe14d] group-hover:border-[#ffe14d] transition-all duration-200 mb-6">
        {icon}
      </div>
      <h3 className="font-mono-ui text-sm font-bold text-white mb-2 group-hover:text-[#ffe14d] transition-colors duration-200">
        {title}
      </h3>
      <p className="text-[13px] text-neutral-500 leading-relaxed group-hover:text-neutral-400 transition-colors duration-200">{desc}</p>
    </div>
  )
}
