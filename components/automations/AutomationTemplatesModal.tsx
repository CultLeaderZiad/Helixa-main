"use client"

import React from "react"
import { X, Sparkles, ArrowRight, Zap } from "lucide-react"
import { ChannelBadge } from "@/components/ui/ChannelBadge"
import { Button } from "@/components/ui/button"

export interface TemplateItem {
  id: string
  title: string
  platform: string
  description: string
  triggerSource: "comment" | "dm" | "story"
  keywords: string
  defaultReply: string
}

export const AUTOMATION_TEMPLATES: TemplateItem[] = [
  {
    id: "ramadan-offer",
    title: "Ramadan offer DM",
    platform: "instagram",
    description: 'Comment "رمضان" → offer + Paymob link',
    triggerSource: "comment",
    keywords: "رمضان, عرض",
    defaultReply: "كل سنة وحضرتك طيب! 🌙 خصم خاص بمناسبة شهر رمضان: https://accept.paymob.com/p/preview",
  },
  {
    id: "cod-confirmation",
    title: "COD order confirmation",
    platform: "whatsapp",
    description: "Confirm address, then notify courier",
    triggerSource: "dm",
    keywords: "تأكيد, طلب, عنوان",
    defaultReply: "أهلاً بك! برجاء تأكيد عنوان التوصيل ورقم الهاتف لتسليم الشحنة لشركة الشحن.",
  },
  {
    id: "white-friday",
    title: "White Friday drop",
    platform: "tiktok",
    description: "Waitlist via comment, alert at launch",
    triggerSource: "comment",
    keywords: "جمعة, خصم, كود",
    defaultReply: "سجلناك في قائمة الانتظار لعروض الجمعة البيضاء! أول ما تبدأ هنبعتلك كود الخصم الحصري 🎁",
  },
  {
    id: "price-inquiry",
    title: "Price inquiry auto-responder",
    platform: "instagram",
    description: "Comment containing 'price' or 'بكام' sends product catalog",
    triggerSource: "comment",
    keywords: "price, بكام, السعر",
    defaultReply: "بعتنالك كل التفاصيل والأسعار في رسالة خاصة 🌸",
  },
]

interface AutomationTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: TemplateItem) => void
}

export function AutomationTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
}: AutomationTemplatesModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-xl border border-[var(--line)] bg-[var(--s1)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--gold)]" />
            <h3 className="text-sm font-semibold text-[var(--t1)]">
              Pre-built Automation Templates
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[4px] text-[var(--t3)] hover:text-[var(--t1)] hover:bg-[var(--s2)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Templates List */}
        <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {AUTOMATION_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                onSelectTemplate(tmpl)
                onClose()
              }}
              className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--s2)] hover:bg-[var(--s3)] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <ChannelBadge
                  channel={tmpl.platform}
                  size="sm"
                  className="w-5 h-5 rounded-full shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <h4 className="text-[13px] font-semibold text-[var(--t1)] group-hover:text-white transition-colors">
                    {tmpl.title}
                  </h4>
                  <p className="text-[11.5px] text-[var(--t3)] mt-0.5">
                    {tmpl.description}
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="h-[28px] px-2.5 text-[11.5px] font-medium gap-1 shrink-0"
              >
                <span>Use template</span>
                <ArrowRight className="w-3 h-3 text-[var(--t3)]" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
