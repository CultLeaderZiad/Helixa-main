"use client"

import React, { useState, useEffect, useRef } from "react"
import { Upload, User, Globe, Clock, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/LanguageContext"
import { toast } from "sonner"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"

export function ProfileSettingsSection() {
  const { language, setLanguage } = useLanguage()
  const { data: meData, mutate } = useSWR("/api/auth/me", fetcher)

  const [name, setName] = useState("Ziad Sabry")
  const [email, setEmail] = useState("ziad@mirage.agency")
  const [timezone, setTimezone] = useState("Africa/Cairo")
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (meData?.authenticated) {
      if (meData.username) setName(meData.username)
      if (meData.email) setEmail(meData.email)
    }
  }, [meData])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
        }),
      })

      if (res.ok) {
        toast.success("Profile saved")
        mutate()
      } else {
        toast.error("Failed to update profile")
      }
    } catch {
      toast.error("Network error saving profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 select-none">
      <div className="space-y-1">
        <h1 className="text-[20px] font-bold text-[var(--t1)] tracking-tight">
          Profile
        </h1>
        <p className="text-[12.5px] text-[var(--t2)]">
          Manage your personal details and how your agency teammates see you.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 divide-y divide-[var(--line)]">
        {/* Block 1: Personal Details */}
        <div className="pt-2 grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6 items-start">
          <div className="space-y-1">
            <h3 className="text-[13px] font-semibold text-[var(--t1)]">
              Personal info
            </h3>
            <p className="text-[11.5px] text-[var(--t3)] leading-relaxed">
              Your name and photo appear on internal team notes and customer conversations.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            {/* Avatar & Upload */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#E9C77E] text-black font-semibold text-lg flex items-center justify-center shrink-0">
                ZS
              </div>
              <div className="space-y-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={() => toast.success("Profile photo updated")}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[28px] text-[11.5px] gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Change photo</span>
                </Button>
                <p className="text-[11px] text-[var(--t3)]">
                  JPG, GIF or PNG. 1MB max.
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-name"
                className="text-[11.5px] text-[var(--t2)] font-medium block"
              >
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-[34px] rounded-[6px] bg-[var(--s2)] border border-[var(--line2)] px-3 text-[12.5px] text-[var(--t1)] outline-none focus:border-[var(--line3)]"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-email"
                className="text-[11.5px] text-[var(--t2)] font-medium block"
              >
                Email address
              </label>
              <div className="h-[34px] rounded-[6px] bg-[var(--s2)]/50 border border-[var(--line)] px-3 flex items-center justify-between">
                <span className="font-mono text-[12px] text-[var(--t2)]">
                  <bdi dir="ltr">{email}</bdi>
                </span>
                <span className="text-[10.5px] text-[var(--t3)] font-mono">
                  Read-only
                </span>
              </div>
              <p className="text-[11px] text-[var(--t3)]">
                Email address is tied to your primary Google authentication.
              </p>
            </div>
          </div>
        </div>

        {/* Block 2: Localization */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6 items-start">
          <div className="space-y-1">
            <h3 className="text-[13px] font-semibold text-[var(--t1)]">
              Preferences
            </h3>
            <p className="text-[11.5px] text-[var(--t3)] leading-relaxed">
              Default language and timezone for reporting timestamps.
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            {/* Language */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-language"
                className="text-[11.5px] text-[var(--t2)] font-medium block"
              >
                Interface language
              </label>
              <select
                id="profile-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "ar")}
                className="w-full h-[34px] rounded-[6px] bg-[var(--s2)] border border-[var(--line2)] px-3 text-[12.5px] text-[var(--t1)] outline-none cursor-pointer"
              >
                <option value="en">English (United States)</option>
                <option value="ar">العربية (Egypt &amp; MENA)</option>
              </select>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-timezone"
                className="text-[11.5px] text-[var(--t2)] font-medium block"
              >
                Timezone
              </label>
              <select
                id="profile-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full h-[34px] rounded-[6px] bg-[var(--s2)] border border-[var(--line2)] px-3 text-[12.5px] text-[var(--t1)] outline-none cursor-pointer font-mono text-[12px]"
              >
                <option value="Africa/Cairo">Africa/Cairo (UTC+02:00 / UTC+03:00)</option>
                <option value="Asia/Riyadh">Asia/Riyadh (UTC+03:00)</option>
                <option value="Asia/Dubai">Asia/Dubai (UTC+04:00)</option>
                <option value="Europe/London">Europe/London (UTC+00:00)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving}
                className="h-[30px] px-4 text-xs font-semibold"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
