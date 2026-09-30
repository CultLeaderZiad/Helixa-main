"use client"

import { useEffect } from "react"
import { captureException } from "@/lib/monitoring"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void captureException(error, { source: "global-error", digest: error.digest || "" })
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#03010A", color: "#ededed", fontFamily: "sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: "#a3a3a3", fontSize: 14 }}>The error was recorded. You can try the page again.</p>
            <button type="button" onClick={() => reset()} style={{ marginTop: 16, padding: "8px 14px", borderRadius: 8 }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
