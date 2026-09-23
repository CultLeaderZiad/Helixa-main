"use client"

import Link from "next/link"
import { useLanguage } from "@/lib/i18n/LanguageContext"

const GITHUB_URL = "https://github.com/CultLeaderZiad"
const LINKEDIN_URL = "https://www.linkedin.com/in/ziad-sabry-cl/"
const TELEGRAM_URL = "https://t.me/cultleaderziad"

export function Footer() {
  const { t, language } = useLanguage()

  const isAr = language === "ar"

  return (
    <footer className="relative bg-[#050508] border-t border-white/[0.08] overflow-hidden text-neutral-400 font-sans">
      {/* Top subtle grid lines aesthetic */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="absolute top-0 inset-x-0 h-6 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />

      {/* Massive Background Watermark Typography: "HELIX" */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
        <span
          className="font-sans font-black text-[clamp(9rem,26vw,24rem)] tracking-[-0.04em] text-white/[0.11] leading-none uppercase select-none pointer-events-none"
          style={{ willChange: "transform" }}
        >
          HELIX  DM
        </span>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-4 lg:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <span className="w-8 h-8 rounded-lg bg-[#0e0e14] border border-white/10 flex items-center justify-center text-[#e5a93c] group-hover:border-[#e5a93c]/40 transition-colors">
                <span className="font-mono-ui font-black text-sm">H</span>
              </span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-[#e5a93c] transition-colors">
                {isAr ? "هيليكسا أوتو دي إم" : "Helix Auto DM"}
              </span>
            </Link>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm">
              {isAr
                ? "منصة الأتمتة الاجتماعية الشاملة. إدارة علاقات العملاء، والردود الآلية، ومحركات الذكاء الاصطناعي — صُممت لصناع المحتوى والشركات الحديثة."
                : "The all-in-one social automation platform. CRM, auto-DMs, and AI growth engines — built for serious creators, agencies, and modern brands."}
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs font-mono-ui">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <span>GitHub</span>
              </a>
              <span className="text-white/15">•</span>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-[#0A66C2] transition-colors flex items-center gap-1.5"
              >
                <span>LinkedIn</span>
              </a>
              <span className="text-white/15">•</span>
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-[#2AABEE] transition-colors flex items-center gap-1.5"
              >
                <span>Telegram Support</span>
              </a>
            </div>
          </div>

          {/* Product Col */}
          <div className="md:col-span-3 lg:col-span-2 space-y-4">
            <h4 className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">
              {isAr ? "المنتج" : "Product"}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/dashboard/inbox" className="hover:text-white transition-colors">
                  {isAr ? "إدارة جهات الاتصال" : "CRM & Contacts"}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/automations" className="hover:text-white transition-colors">
                  {isAr ? "الأتمتة" : "Automations"}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/ai-engine" className="hover:text-white transition-colors">
                  {isAr ? "محرك الذكاء الاصطناعي" : "AI Engine"}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/connected-platforms" className="hover:text-white transition-colors">
                  {isAr ? "المنصات المتصلة" : "Integrations"}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  {t.pricing || "Pricing"}
                </Link>
              </li>
              <li>
                <Link href="/updates" className="hover:text-white transition-colors">
                  {isAr ? "التحديثات وسجل التغيير" : "Changelog & Updates"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Col */}
          <div className="md:col-span-3 lg:col-span-3 space-y-4">
            <h4 className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">
              {isAr ? "الشركة" : "Company"}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  {isAr ? "عن المنصة" : "About"}
                </Link>
              </li>
              <li>
                <Link href="/updates" className="hover:text-white transition-colors">
                  {isAr ? "سجل التغييرات" : "Changelog"}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  {t.faq || "FAQ"}
                </Link>
              </li>
              <li>
                <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  {isAr ? "مستودع GitHub" : "GitHub Repository"}
                </a>
              </li>
              <li>
                <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  {isAr ? "حساب المؤسس LinkedIn" : "Founder LinkedIn"}
                </a>
              </li>
              <li>
                <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[#2AABEE] transition-colors">
                  {isAr ? "مجتمع تيليجرام" : "Telegram Community"}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Col */}
          <div className="md:col-span-2 lg:col-span-2 space-y-4">
            <h4 className="font-mono-ui text-[11px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">
              {isAr ? "قانوني" : "Legal"}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  {t.terms || "Terms of Service"}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {t.privacy || "Privacy Policy"}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {isAr ? "الأمان والحماية" : "Security"}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {isAr ? "ملفات تعريف الارتباط" : "Cookie Policy"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar matching Screenshot 3 & 4 */}
        <div className="border-t border-white/[0.08] mt-12 pt-8 flex flex-col xl:flex-row items-center justify-between gap-6 text-xs font-mono-ui text-neutral-500">
          <div>
            © 2026 HELIX AUTO DM. {t.rightsReserved ? t.rightsReserved.toUpperCase() : "ALL RIGHTS RESERVED."}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4">
            <div className="flex items-center gap-3">
              <Link href="/pricing" className="hover:text-neutral-300 transition-colors">
                {t.pricing || "Pricing"}
              </Link>
              <Link href="/privacy" className="hover:text-neutral-300 transition-colors">
                {t.privacy || "Privacy"}
              </Link>
              <Link href="/terms" className="hover:text-neutral-300 transition-colors">
                {t.terms || "Terms"}
              </Link>
            </div>

            <span className="text-white/20">|</span>

            <div className="flex items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300 transition-colors"
              >
                GitHub
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-300 transition-colors"
              >
                LinkedIn
              </a>
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#2AABEE] transition-colors"
              >
                {t.telegramSupport || "Telegram support"}
              </a>
            </div>
          </div>

          <div className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-[2px] bg-emerald-500 animate-pulse" />
            <span className="font-bold text-neutral-400 tracking-wider text-[11px]">
              {isAr ? "جميع الأنظمة تعمل بكفاءة" : "ALL SYSTEMS OPERATIONAL"}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
