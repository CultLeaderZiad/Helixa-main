import * as React from "react"
import { cn } from "@/lib/utils"
import { MessageSquare, Send, Share2, Radio, MessageCircle } from "lucide-react"

export type ChannelType = "instagram" | "whatsapp" | "facebook" | "messenger" | "tiktok" | "telegram" | "webchat"

interface ChannelBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  channel: ChannelType | string
  size?: "sm" | "md" // sm: 18px, md: 32px
}

const channelConfig: Record<string, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  instagram: {
    label: "Instagram",
    bg: "bg-gradient-to-tr from-[#FD5949] via-[#D6249F] to-[#285AEB]",
    text: "text-white",
    icon: MessageSquare,
  },
  whatsapp: {
    label: "WhatsApp",
    bg: "bg-[#25D366]",
    text: "text-white",
    icon: MessageCircle,
  },
  facebook: {
    label: "Facebook",
    bg: "bg-[#1877F2]",
    text: "text-white",
    icon: Share2,
  },
  messenger: {
    label: "Messenger",
    bg: "bg-[#0084FF]",
    text: "text-white",
    icon: MessageSquare,
  },
  tiktok: {
    label: "TikTok",
    bg: "bg-[#000000] border border-[#25F4EE]/50",
    text: "text-[#25F4EE]",
    icon: Radio,
  },
  telegram: {
    label: "Telegram",
    bg: "bg-[#2AABEE]",
    text: "text-white",
    icon: Send,
  },
  webchat: {
    label: "Website chat",
    bg: "bg-[var(--gold)]",
    text: "text-black",
    icon: MessageSquare,
  },
}

export function ChannelBadge({ channel, size = "sm", className, ...props }: ChannelBadgeProps) {
  const normChannel = channel.toLowerCase()
  const conf = channelConfig[normChannel] || {
    label: channel,
    bg: "bg-[var(--s3)]",
    text: "text-[var(--t1)]",
    icon: MessageSquare,
  }
  const Icon = conf.icon

  const sizeClasses = size === "sm" ? "size-[18px] rounded-[4px] [&_svg]:size-2.5" : "size-[32px] rounded-[8px] [&_svg]:size-4"

  return (
    <span
      role="img"
      aria-label={conf.label}
      className={cn(
        "inline-flex items-center justify-center shrink-0 select-none shadow-xs",
        sizeClasses,
        conf.bg,
        conf.text,
        className
      )}
      {...props}
    >
      <Icon />
    </span>
  )
}
