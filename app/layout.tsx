import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"

import { GlobalBanner } from "@/components/layout/GlobalBanner"
import { GlobalUpdatesListener } from "@/components/layout/GlobalUpdatesListener"

import { LanguageProvider } from "@/lib/i18n/LanguageContext"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Helixa - Automate your Dm's",
  description: "Auto-reply to comments, DMs, and stories with keyword triggers.",
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&display=swap"
        />
      </head>
      <body className={`font-sans antialiased bg-[#03010A]`} suppressHydrationWarning>
        <LanguageProvider>
          <ThemeProvider>
            <GlobalBanner />
            <GlobalUpdatesListener />
            {children}
            <Toaster />
          </ThemeProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
