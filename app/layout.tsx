import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Noto_Sans_Arabic, Cairo } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"

import { GlobalBanner } from "@/components/layout/GlobalBanner"
import { GlobalUpdatesListener } from "@/components/layout/GlobalUpdatesListener"
import { WebVitalsReporter } from "@/components/performance/WebVitalsReporter"

import { LanguageProvider } from "@/lib/i18n/LanguageContext"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { SWRProvider } from "@/components/swr-provider"
import SkipLink from "@/components/a11y/SkipLink"
import CookieBanner from "@/components/layout/CookieBanner"

const _geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const _geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const _notoSansArabic = Noto_Sans_Arabic({ subsets: ["arabic"], variable: "--font-noto-arabic", display: "swap" })
const _cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" })

import { BRAND } from "@/lib/brand"

export const metadata: Metadata = {
  title: `${BRAND.name} - ${BRAND.tagline}`,
  description: "DM automation for every channel. AI solutions for comments, DMs, and social conversations.",
  icons: {
    icon: "/brand/icon-32.png",
    apple: "/brand/icon-180.png",
  },
  manifest: "/manifest.json",
  other: {
    "theme-color": "#09090B",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

const fontVariables = [_geist.variable, _geistMono.variable, _notoSansArabic.variable, _cairo.variable].filter(Boolean).join(' ')

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="font-sans antialiased bg-[#09090B] text-[#EDEDEF]" suppressHydrationWarning>
        <ErrorBoundary>
          <SkipLink />
          <LanguageProvider>
            <ThemeProvider>
              <SWRProvider>
                <GlobalBanner />
                <GlobalUpdatesListener />
                <WebVitalsReporter />
                {children}
                <Toaster />
                <CookieBanner />
              </SWRProvider>
            </ThemeProvider>
          </LanguageProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
