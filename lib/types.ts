// Shared types for the automation system
export type ButtonAction = "web_url" | "postback"

export interface ProButton {
  id: string
  type: ButtonAction
  title: string
  url?: string
  payload?: string
}

export interface QuickReplyOption {
  id: string
  title: string
  payload?: string
}

export interface MediaResponse {
  type: "image" | "video" | "audio"
  url: string
}

// The JSON stored in automations.response_content
export interface ResponseContent {
  message?: string
  card?: {
    title: string
    subtitle?: string
    image_url?: string
    buttons: Omit<ProButton, "id">[]
  }
  media?: MediaResponse
  quick_replies?: { title: string; payload?: string }[]
  check_follow?: boolean
  // Comment automation options
  reply_mode?: "both" | "dm_only" | "public_only"
  public_replies?: string[]
  include_replies?: boolean
  // Delivery options
  delay_seconds?: number
  typing_indicator?: boolean
  mark_seen?: boolean
  // Lead Capture options
  lead_capture?: {
    require_email?: boolean
    require_name?: boolean
    require_phone?: boolean
  }
}

export interface AutomationVariant {
  id: string
  automation_id: string
  variant_name: string
  traffic_weight: number
  response_config: any
  created_at: string
}

export interface MediaItem {
  id: string
  media_id: string
  media_type: string
  caption: string
  image_url: string
  video_url: string
  permalink: string
  media_product_type: string
  timestamp: string
}

export interface MediaSelection {
  reel_id: string
  caption?: string
}

export interface Automation {
  id: string
  name: string
  trigger_source: "comment" | "dm" | "story"
  trigger_value: string
  trigger_type: "keyword" | "postback" | "reply_all" | "mention" | "reaction" | "reply"
  response_content: ResponseContent
  is_active: boolean
  created_at: string
  specific_media_id?: string | null
  media_selection?: MediaSelection | null
  selected_reel_id?: string | null
  automation_variants?: AutomationVariant[]
}
