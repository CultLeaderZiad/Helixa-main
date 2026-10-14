import * as React from "react"
import { cn } from "@/lib/utils"
import {
  InstagramIcon,
  WhatsAppIcon,
  FacebookIcon,
  MessengerIcon,
  TikTokIcon,
  TelegramIcon,
  WebChatIcon,
} from "@/components/icons/PlatformIcons"

export type ChannelType = "instagram" | "whatsapp" | "facebook" | "messenger" | "tiktok" | "telegram" | "webchat"

interface ChannelBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  channel: ChannelType | string
  size?: "sm" | "md" | "lg" // sm: 18px, md: 28px, lg: 36px
}

const channelMap: Record<string, { label: string; component: React.ComponentType<{ size?: number | string; className?: string }> }> = {
  instagram: {
    label: "Instagram",
    component: InstagramIcon,
  },
  whatsapp: {
    label: "WhatsApp",
    component: WhatsAppIcon,
  },
  facebook: {
    label: "Facebook",
    component: FacebookIcon,
  },
  messenger: {
    label: "Messenger",
    component: MessengerIcon,
  },
  tiktok: {
    label: "TikTok",
    component: TikTokIcon,
  },
  telegram: {
    label: "Telegram",
    component: TelegramIcon,
  },
  webchat: {
    label: "Website chat",
    component: WebChatIcon,
  },
}

export function ChannelBadge({ channel, size = "sm", className, ...props }: ChannelBadgeProps) {
  const normChannel = channel ? channel.toLowerCase() : "instagram"
  const conf = channelMap[normChannel] || {
    label: channel || "Chat",
    component: WebChatIcon,
  }
  const IconComponent = conf.component

  const pixelSize = size === "sm" ? 18 : size === "md" ? 28 : 36

  return (
    <span
      role="img"
      aria-label={conf.label}
      className={cn(
        "inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full shadow-xs transition-transform hover:scale-105",
        size === "sm" && "w-[18px] h-[18px]",
        size === "md" && "w-[28px] h-[28px]",
        size === "lg" && "w-[36px] h-[36px]",
        className
      )}
      {...props}
    >
      <IconComponent size={pixelSize} className="w-full h-full object-contain" />
    </span>
  )
}
