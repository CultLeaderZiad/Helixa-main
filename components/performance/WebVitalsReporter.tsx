"use client"

import { useReportWebVitals } from "next/web-vitals"

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Web Vitals] ${metric.name}:`, Math.round(metric.value * 100) / 100, metric.rating)
    }
  })

  return null
}
