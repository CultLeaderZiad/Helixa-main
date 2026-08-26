/**
 * Shared webhook utility functions used by Instagram, Facebook, and Telegram handlers.
 * Extracted to reduce code duplication and ensure consistent behavior.
 */

/**
 * Parse automation response content from various formats (JSON string, object, etc.)
 */
export function parseContent(raw: any): Record<string, any> {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw)
    } catch {
      return { message: raw }
    }
  }
  return raw
}

/**
 * Pick a random item from an array
 */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Select an automation variant based on traffic weights.
 * Returns the selected content and variant ID.
 */
export function pickVariant(rule: any): { content: any; variantId: string | null } {
  let responseContent = rule.response_content
  let variantId = null

  if (rule.automation_variants && rule.automation_variants.length > 0) {
    const defaultWeight = 100 - rule.automation_variants.reduce(
      (sum: number, v: any) => sum + (v.traffic_weight || 0), 0
    )

    const allOptions = [
      { id: null, content: rule.response_content, weight: Math.max(0, defaultWeight) },
      ...rule.automation_variants.map((v: any) => ({
        id: v.id,
        content: v.response_config,
        weight: v.traffic_weight || 50,
      })),
    ]

    const random = Math.random() * 100
    let sum = 0
    for (const opt of allOptions) {
      sum += opt.weight
      if (random <= sum) {
        responseContent = opt.content
        variantId = opt.id
        break
      }
    }
  }

  return { content: responseContent, variantId }
}

/**
 * Check if a trigger value (comma-separated keywords) matches any keyword in the text.
 * Uses word boundary matching with fallback to simple includes.
 */
export function keywordMatches(triggerValue: string, text: string): boolean {
  if (!triggerValue) return false
  return triggerValue
    .split(",")
    .map((k: string) => k.trim())
    .filter(Boolean)
    .some((k: string) => {
      try {
        return new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)
      } catch {
        return text.toLowerCase().includes(k.toLowerCase())
      }
    })
}

/**
 * Get a preview text from automation content for logging purposes.
 */
export function responsePreviewText(content: any): string {
  if (typeof content === "string") return content
  if (content.message) return content.message
  if (content.card) return `[Card] ${content.card.title}`
  if (content.media?.url) return `[${content.media.type || "media"}]`
  return "[automation]"
}

/**
 * Check if a trial has expired and optionally mark it in the database.
 * Returns the effective plan status.
 */
export async function checkTrialStatus(
  supabase: any,
  account: { id: string; plan: string; trial_ends_at: string | null; trial_exempt: boolean | null }
): Promise<string> {
  if (account.plan === "trial" && account.trial_ends_at && !account.trial_exempt) {
    const trialEnded = new Date(account.trial_ends_at) < new Date()
    if (trialEnded) {
      // Mark as expired in the database
      await supabase
        .from("accounts")
        .update({ plan: "expired", updated_at: new Date().toISOString() })
        .eq("id", account.id)
      return "expired"
    }
  }
  return account.plan
}
