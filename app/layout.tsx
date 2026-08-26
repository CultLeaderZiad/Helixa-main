import type React from "react"
import type { Metadata } from "next"
import { Geist, Instrument_Serif, JetBrains_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"

import { GlobalBanner } from "@/components/layout/GlobalBanner"
import { GlobalUpdatesListener } from "@/components/layout/GlobalUpdatesListener"
import { WebVitalsReporter } from "@/components/performance/WebVitalsReporter"

import { LanguageProvider } from "@/lib/i18n/LanguageContext"
import { ErrorBoundary } from "@/components/ui/error-boundary"

const _geist = Geist({ subsets: ["latin"] })
const _instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" })
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

export const metadata: Metadata = {
  title: "Helixa - Automate your Dm's",
  description: "Auto-reply to comments, DMs, and stories with keyword triggers.",
  icons: {
    icon: "/icon.svg",
  },
  other: {
    "theme-color": "#03010A",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

const fontVariables = [_instrumentSerif.variable, _jetbrainsMono.variable].filter(Boolean).join(' ')

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="font-sans antialiased bg-[#03010A]" suppressHydrationWarning>
        <ErrorBoundary>
          <LanguageProvider>
            <ThemeProvider>
              <GlobalBanner />
              <GlobalUpdatesListener />
              <WebVitalsReporter />
              {children}
              <Toaster />
            </ThemeProvider>
          </LanguageProvider>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
