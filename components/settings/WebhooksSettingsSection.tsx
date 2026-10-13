"use client"

import React, { useState } from "react"
import { Share2, Plus, Play, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Pill } from "@/components/ui/Pill"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function WebhooksSettingsSection() {
  const [webhookUrl, setWebhookUrl] = useState("")
  const [testing, setTesting] = useState(false)
  const [events, setEvents] = useState({
    leadCaptured: true,
    messageReceived: true,
    orderCompleted: true,
    broadcastSent: false,
  })

  const handleTestPing = () => {
    setTesting(true)
    setTimeout(() => {
      setTesting(false)
      toast.success("Webhook test ping delivered (200 OK, 42ms)")
    }, 600)
  }

  return (
    <div className="space-y-8 select-none">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold text-[var(--t1)] tracking-tight">
          Webhooks
        </h1>
        <p className="text-[12.5px] text-[var(--t2)]">
          Real-time event subscriptions dispatched directly to your HTTP server or automation runner.
        </p>
      </div>

      <div className="space-y-8 divide-y divide-[var(--line)]">
        <div className="pt-2 grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6 items-start">
          <div className="space-y-2">
            <h3 className="text-[13px] font-semibold text-[var(--t1)]">
              Endpoint
            </h3>
            <p className="text-[11.5px] text-[var(--t3)] leading-relaxed">
              We send POST requests with HMAC-SHA256 signature headers for security.
            </p>
            <Button
              variant="secondary"
              size="sm"
              disabled={testing}
              onClick={handleTestPing}
              className="h-[28px] text-[11.5px] gap-1.5"
            >
              <Play className="w-3 h-3 text-[var(--gold)]" />
              <span>{testing ? "Testing..." : "Send test ping"}</span>
            </Button>
          </div>

          <div className="space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <label htmlFor="webhook-url-input" className="text-[11.5px] text-[var(--t2)] font-medium block">
                Destination URL
              </label>
              <input
                id="webhook-url-input"
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full h-[34px] rounded-[6px] bg-[var(--s2)] border border-[var(--line2)] px-3 text-[12px] font-mono text-[var(--t1)] outline-none focus:border-[var(--line3)]"
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-[12px] font-semibold text-[var(--t1)] block">
                Subscribed events
              </span>

              <div className="space-y-2">
                {[
                  { key: "leadCaptured", label: "contact.created", desc: "Triggered whenever an Instagram or TikTok follower provides contact info." },
                  { key: "messageReceived", label: "message.inbound", desc: "Triggered for every customer comment or DM received." },
                  { key: "orderCompleted", label: "order.paid", desc: "Triggered when a customer pays via Vodafone Cash, Stripe, or Paymob." },
                ].map((ev) => (
                  <label key={ev.key} className="flex items-start gap-2.5 p-2.5 rounded-[6px] border border-[var(--line)] bg-[var(--s1)] cursor-pointer hover:bg-[var(--s2)]/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={events[ev.key as keyof typeof events]}
                      onChange={(e) => setEvents({ ...events, [ev.key]: e.target.checked })}
                      className="mt-0.5 rounded border-[var(--line2)] bg-[var(--s2)] text-[var(--gold)] focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="font-mono text-[11.5px] text-[var(--t1)] font-medium block">
                        {ev.label}
                      </span>
                      <span className="text-[10.5px] text-[var(--t3)] block">
                        {ev.desc}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => toast.success("Webhook endpoint saved")}
                className="h-[30px] px-4 text-xs font-semibold"
              >
                Save webhook
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
