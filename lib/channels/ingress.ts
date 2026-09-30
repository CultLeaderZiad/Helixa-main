import { pickPageConnection } from "@/lib/channel-ids"
import { createInstagramAdapter, createMessengerAdapter, createTelegramAdapter, createWhatsAppAdapter } from "@/lib/channels/adapters"
import { accountMayAutomate, runChannelPipeline, type TenantContext } from "@/lib/channels/pipeline"
import { normalizeFacebookBody, normalizeInstagramBody, normalizeTelegramUpdate, normalizeWhatsAppBody } from "@/lib/channels/normalize"
import type { AutomationRule, ChannelPolicy, Db, NormalizedInbound } from "@/lib/channels/types"
import { watchInstagramAuthFailures } from "@/lib/instagram-api"
import { markInstagramReconnect } from "@/lib/instagram-token"
import { answerTelegramCallbackQuery } from "@/lib/telegram-api"
import { openAccessToken, sealAccessToken, tokenNeedsReseal } from "@/lib/token-crypto"

const INSTAGRAM_POLICY: ChannelPolicy = {
  commentMatch: "instagram",
  dmReplyAll: false,
  iceBreakers: true,
  followGate: true,
  privateReplyStyle: "instagram_card",
  conversationPlatform: "instagram",
  eventPlatform: "instagram",
  outboundEventType: "dm_reply",
  aiChannelName: "Instagram",
}

const MESSENGER_POLICY: ChannelPolicy = {
  commentMatch: "facebook",
  dmReplyAll: true,
  iceBreakers: false,
  followGate: false,
  privateReplyStyle: "append_links",
  conversationPlatform: "messenger",
  eventPlatform: "facebook",
  outboundEventType: "sent",
  aiChannelName: "Messenger",
}

const WHATSAPP_POLICY: ChannelPolicy = {
  commentMatch: "facebook",
  dmReplyAll: false,
  iceBreakers: false,
  followGate: false,
  privateReplyStyle: "none",
  conversationPlatform: "whatsapp",
  eventPlatform: "whatsapp",
  outboundEventType: "wa_reply",
  aiChannelName: "WhatsApp",
}

const TELEGRAM_POLICY: ChannelPolicy = {
  commentMatch: "facebook",
  dmReplyAll: true,
  iceBreakers: false,
  followGate: false,
  privateReplyStyle: "none",
  conversationPlatform: "telegram",
  eventPlatform: "telegram",
  outboundEventType: "sent",
  aiChannelName: "Telegram",
}

function record(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  return null
}

function text(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

async function loadRules(supabase: Db, userId: string | number, platform: "instagram" | "facebook" | "whatsapp" | "telegram"): Promise<AutomationRule[]> {
  let query = supabase.from("automations").select("*, automation_variants(*)").eq("user_id", userId).eq("is_active", true)
  if (platform === "instagram") query = query.or("platform.eq.instagram,platform.is.null")
  else if (platform === "facebook") query = query.in("platform", ["facebook", "messenger"])
  else if (platform === "telegram") query = query.or("platform.eq.telegram,platform.is.null")
  else query = query.eq("platform", "whatsapp")
  const { data } = await query
  return (data || []) as AutomationRule[]
}

async function loadAccount(supabase: Db, accountId: string | null | undefined) {
  if (!accountId) return null
  const { data } = await supabase
    .from("accounts")
    .select("id, plan, trial_ends_at, trial_exempt, is_banned")
    .eq("id", accountId)
    .maybeSingle()
  return data
}

async function findInstagramUser(supabase: Db, id: string) {
  if (!id) return null
  const byBusiness = await supabase.from("users").select("*").eq("business_account_id", id).limit(1)
  if (byBusiness.data?.[0]) return byBusiness.data[0]
  const byPage = await supabase.from("users").select("*").eq("page_id", id).limit(1)
  return byPage.data?.[0] || null
}

function instagramCandidates(entry: Record<string, unknown>, webhookId: string): string[] {
  const ids = new Set<string>()
  for (const raw of Array.isArray(entry.changes) ? entry.changes : []) {
    const value = record(record(raw)?.value)
    const owner = text(record(record(value?.media)?.owner)?.id)
    if (owner) ids.add(owner)
  }
  for (const raw of Array.isArray(entry.messaging) ? entry.messaging : []) {
    const recipient = text(record(record(raw)?.recipient)?.id)
    if (recipient) ids.add(recipient)
  }
  ids.delete(webhookId)
  return [...ids]
}

export async function processInstagramWebhookBody(body: unknown, supabase: Db): Promise<void> {
  const root = record(body)
  if (!root || !Array.isArray(root.entry)) return
  if (root.object === "page") {
    await handleFacebookWebhook(body, supabase)
    return
  }

  const normalized = normalizeInstagramBody(body)
  for (const rawEntry of root.entry) {
    const entry = record(rawEntry)
    if (!entry) continue
    const webhookId = text(entry.id)
    let user = await findInstagramUser(supabase, webhookId)
    if (!user) {
      for (const candidate of instagramCandidates(entry, webhookId)) {
        user = await findInstagramUser(supabase, candidate)
        if (user) break
      }
    }
    if (!user?.id) continue

    const storedToken = user.access_token
    let accessToken = ""
    try {
      accessToken = openAccessToken(storedToken) || ""
    } catch (error) {
      console.error("[webhook] Could not decrypt Instagram access token:", error)
      await markInstagramReconnect(supabase, user.id)
      continue
    }
    if (!accessToken) continue
    if (tokenNeedsReseal(storedToken)) {
      await supabase.from("users").update({ access_token: sealAccessToken(accessToken) }).eq("id", user.id)
    }

    const account = await loadAccount(supabase, user.account_id)
    if (!(await accountMayAutomate(supabase, account))) continue

    const stop = watchInstagramAuthFailures(accessToken, () => {
      void markInstagramReconnect(supabase, user.id)
    })
    try {
      const tenant: TenantContext = {
        userId: user.id,
        workspaceId: user.workspace_id || null,
        username: user.username || null,
        accessToken,
        ownIds: [webhookId, text(user.business_account_id), text(user.page_id)].filter(Boolean),
        aiEnabled: Boolean(user.ai_enabled),
        aiContext: user.ai_context || null,
        pageId: text(user.business_account_id) || text(user.page_id) || null,
      }
      const events = normalized.filter((event) => event.accountRef === webhookId)
      await runChannelPipeline({
        supabase,
        adapter: createInstagramAdapter(),
        tenant,
        rules: await loadRules(supabase, user.id, "instagram"),
        events,
        policy: INSTAGRAM_POLICY,
      })
    } finally {
      stop()
    }
  }
}

interface PageConnection {
  user_id?: string | number
  platform?: string | null
  access_token?: string | null
  page_id?: string | null
}

async function pageConnection(supabase: Db, webhookId: string): Promise<PageConnection | null> {
  const select = "user_id, platform, access_token, page_id"
  const byPage = await supabase
    .from("platform_connections")
    .select(select)
    .eq("page_id", webhookId)
    .in("platform", ["facebook", "messenger"])
    .limit(5)
  let connection = pickPageConnection<PageConnection>(byPage.data)
  if (!connection) {
    const byExternal = await supabase
      .from("platform_connections")
      .select(select)
      .eq("external_account_id", webhookId)
      .in("platform", ["facebook", "messenger"])
      .limit(5)
    connection = pickPageConnection<PageConnection>(byExternal.data)
  }
  return connection
}

export async function handleFacebookWebhook(body: unknown, supabase: Db): Promise<void> {
  const root = record(body)
  if (!root || !Array.isArray(root.entry)) return
  const normalized = normalizeFacebookBody(body)

  for (const rawEntry of root.entry) {
    const entry = record(rawEntry)
    if (!entry) continue
    const webhookId = text(entry.id)
    const connection = await pageConnection(supabase, webhookId)
    if (!connection?.user_id) continue
    const { data: user } = await supabase.from("users").select("*").eq("id", connection.user_id).maybeSingle()
    if (!user) continue
    const account = await loadAccount(supabase, user.account_id)
    if (!(await accountMayAutomate(supabase, account))) continue
    const accessToken = openAccessToken(connection.access_token)
    if (!accessToken) continue

    const events = normalized.filter((event) => event.accountRef === webhookId)
    const tenant: TenantContext = {
      userId: user.id,
      workspaceId: user.workspace_id || null,
      username: user.username || null,
      accessToken,
      ownIds: [webhookId, text(connection.page_id)].filter(Boolean),
      aiEnabled: Boolean(user.ai_enabled),
      aiContext: user.ai_context || null,
      pageId: text(connection.page_id) || webhookId,
    }
    await runChannelPipeline({
      supabase,
      adapter: createMessengerAdapter(),
      tenant,
      rules: await loadRules(supabase, user.id, "facebook"),
      events,
      policy: MESSENGER_POLICY,
      onComment: ({ postId, commentId, text: commentText }) => {
        if (!postId || !account?.id) return
        import("@/lib/sentiment-analyzer")
          .then(({ classifyAndCacheCommentSentiment }) =>
            classifyAndCacheCommentSentiment(supabase, account.id, String(postId), commentId, commentText),
          )
          .catch((error) => console.warn("[fb-webhook] sentiment skipped:", error))
      },
    })
  }
}

export async function processWhatsAppWebhookBody(body: unknown, supabase: Db): Promise<void> {
  const events = normalizeWhatsAppBody(body)
  const groups = new Map<string, NormalizedInbound[]>()
  for (const event of events) {
    const key = event.accountRef || ""
    if (!key) continue
    const list = groups.get(key) || []
    list.push(event)
    groups.set(key, list)
  }

  for (const [phoneNumberId, group] of groups) {
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("user_id, access_token, page_id")
      .eq("page_id", phoneNumberId)
      .eq("platform", "whatsapp")
      .maybeSingle()
    if (!connection?.user_id) continue
    const { data: user } = await supabase.from("users").select("*").eq("id", connection.user_id).maybeSingle()
    if (!user) continue
    const account = await loadAccount(supabase, user.account_id)
    if (!(await accountMayAutomate(supabase, account))) continue
    const accessToken = openAccessToken(connection.access_token)
    if (!accessToken) continue
    await runChannelPipeline({
      supabase,
      adapter: createWhatsAppAdapter(),
      tenant: {
        userId: user.id,
        workspaceId: user.workspace_id || null,
        username: user.username || null,
        accessToken,
        senderRef: phoneNumberId,
        ownIds: [phoneNumberId],
        aiEnabled: Boolean(user.ai_enabled),
        aiContext: user.ai_context || null,
        pageId: phoneNumberId,
      },
      rules: await loadRules(supabase, user.id, "whatsapp"),
      events: group,
      policy: WHATSAPP_POLICY,
    })
  }
}

async function telegramConnection(supabase: Db, botId: string) {
  const byPage = await supabase.from("platform_connections").select("*").eq("platform", "telegram").eq("page_id", botId).limit(1)
  if (byPage.data?.[0]) return byPage.data[0]
  const byExternal = await supabase
    .from("platform_connections")
    .select("*")
    .eq("platform", "telegram")
    .eq("external_account_id", botId)
    .limit(1)
  return byExternal.data?.[0] || null
}

export async function processTelegramUpdate(supabase: Db, botId: string, update: unknown): Promise<void> {
  const connection = await telegramConnection(supabase, botId)
  if (!connection?.user_id) throw new Error(`Unknown telegram bot ${botId}`)
  const accessToken = openAccessToken(connection.access_token)
  if (!accessToken) throw new Error("Telegram token could not be read")

  const callback = record(record(update)?.callback_query)
  if (callback?.id) await answerTelegramCallbackQuery(accessToken, text(callback.id))

  const { data: user } = await supabase.from("users").select("*").eq("id", connection.user_id).maybeSingle()
  if (!user) return
  const account = await loadAccount(supabase, user.account_id)
  if (user.account_id && !(await accountMayAutomate(supabase, account))) return

  const events = normalizeTelegramUpdate(update).map((event) => ({ ...event, accountRef: botId }))
  await runChannelPipeline({
    supabase,
    adapter: createTelegramAdapter(),
    tenant: {
      userId: user.id,
      workspaceId: user.workspace_id || null,
      username: user.username || null,
      accessToken,
      ownIds: [botId],
      aiEnabled: Boolean(user.ai_enabled),
      aiContext: user.ai_context || null,
      pageId: botId,
    },
    rules: await loadRules(supabase, user.id, "telegram"),
    events,
    policy: TELEGRAM_POLICY,
  })
}
