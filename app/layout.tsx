import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Instrument_Serif, JetBrains_Mono, Roboto_Flex } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"

import { GlobalBanner } from "@/components/layout/GlobalBanner"
import { GlobalUpdatesListener } from "@/components/layout/GlobalUpdatesListener"
import { WebVitalsReporter } from "@/components/performance/WebVitalsReporter"

import { LanguageProvider } from "@/lib/i18n/LanguageContext"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" })
const _jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })
const _robotoFlex = Roboto_Flex({ subsets: ["latin"], variable: "--font-roboto-flex" })

export const metadata: Metadata = {
  title: "Helixa - Automate your Dm's",
  description: "Auto-reply to comments, DMs, and stories with keyword triggers.",
  icons: {
    icon: "/icon.svg",
  },
}

const fontVariables = [_instrumentSerif.variable, _jetbrainsMono.variable, _robotoFlex.variable].filter(Boolean).join(' ')

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="font-sans antialiased bg-[#03010A]" suppressHydrationWarning>
        <LanguageProvider>
          <ThemeProvider>
            <GlobalBanner />
            <GlobalUpdatesListener />
            <WebVitalsReporter />
            {children}
            <Toaster />
          </ThemeProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
