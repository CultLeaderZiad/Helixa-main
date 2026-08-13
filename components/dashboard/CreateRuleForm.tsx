"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus, Trash2, Film, Check, MessageCircle, Send, AtSign, Heart,
  MessageSquare, Image as ImageIcon, Timer, Eye, Megaphone, Lock,
  Link2, Zap, ChevronDown, ChevronRight, ChevronLeft, X, Loader2,
  ArrowLeft, Phone, Video, Info, Sparkles, Smile, Camera, Mic, Image as PicIcon,
  Globe
} from "lucide-react"
import { TagInput } from "@/components/ui/tag-input"
import type { ProButton, QuickReplyOption, Automation } from "@/lib/types"
import { toast } from "sonner"

/* ============================================================
   AESTHETIC & SEXY WIZARD FOR INSTAGRAM AUTOMATION RULES
   Step 1: TRIGGER  — Select Reel/Post first, then set keywords
   Step 2: RESPONSE — What do they get?
   Step 3: SETTINGS — Name it & delivery options
   ============================================================ */

interface CreateRuleFormProps {
  userId: string
  triggerSource: "comment" | "dm" | "story"
  onSuccess: () => void
  editRule?: Automation | null
  initialIntent?: string
  defaultPlatform?: string
}

const STEPS = [
  { key: "trigger", label: "Trigger Source", sub: "When does it fire?" },
  { key: "response", label: "Reply Payload", sub: "What do they get?" },
  { key: "settings", label: "Final Settings", sub: "Speed & restrictions" },
] as const

export function CreateRuleForm({ userId, triggerSource, onSuccess, editRule, initialIntent, defaultPlatform }: CreateRuleFormProps) {
  const isEditing = !!editRule
  const [step, setStep] = useState(0)

  /* ---------- WHEN ---------- */
  const [triggers, setTriggers] = useState<string[]>([])
  const [storyTriggerType, setStoryTriggerType] = useState<"mention" | "reaction" | "reply">("mention")
  const [selectedReel, setSelectedReel] = useState<any | null>(null)
  const [hasSelectedReelOption, setHasSelectedReelOption] = useState<boolean>(false)

  /* ---------- THEN ---------- */
  const [type, setType] = useState<"text" | "card" | "media">("text")
  const [messageText, setMessageText] = useState("")
  const [cardTitle, setCardTitle] = useState("")
  const [cardSubtitle, setCardSubtitle] = useState("")
  const [cardImage, setCardImage] = useState("")
  const [buttons, setButtons] = useState<ProButton[]>([])
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio">("image")
  const [quickReplies, setQuickReplies] = useState<QuickReplyOption[]>([])

  /* ---------- Public comment reply ---------- */
  const [replyMode, setReplyMode] = useState<"both" | "dm_only" | "public_only">("both")
  const [publicReplies, setPublicReplies] = useState<string[]>([])
  const [includeReplies, setIncludeReplies] = useState(false)

  /* ---------- EXTRAS ---------- */
  const [variants, setVariants] = useState<{ id: string, text: string, weight: number }[]>([])
  const [name, setName] = useState("")
  const [checkFollow, setCheckFollow] = useState(false)
  const [delaySeconds, setDelaySeconds] = useState(0)
  const [typingIndicator, setTypingIndicator] = useState(false)
  
  /* ---------- LEAD CAPTURE ---------- */
  const [captureEmail, setCaptureEmail] = useState(false)
  const [capturePhone, setCapturePhone] = useState(false)
  const [captureName, setCaptureName] = useState(false)

  const [saving, setSaving] = useState(false)
  const [reels, setReels] = useState<any[]>([])
  const [loadingReels, setLoadingReels] = useState(false)

  /* ---------- AI ---------- */
  const [copySuggestions, setCopySuggestions] = useState<{id?: string, text: string}[]>([])
  const [generatingCopy, setGeneratingCopy] = useState(false)
  const [keywordSuggestions, setKeywordSuggestions] = useState<{id?: string, text: string}[]>([])
  const [generatingKeywords, setGeneratingKeywords] = useState(false)

  /* ---------- PROMPT 16 ADDITIONS ---------- */
  const [cardStyle, setCardStyle] = useState<"modern" | "classic" | "minimal">("modern")
  const [specificMediaUrl, setSpecificMediaUrl] = useState("")
  const [resolvingUrl, setResolvingUrl] = useState(false)
  const [platform, setPlatform] = useState<"instagram" | "messenger" | "facebook" | "telegram">((defaultPlatform as any) || "instagram")
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>(["instagram"])

  const [intentDescription, setIntentDescription] = useState(initialIntent || "")
  const [parsingIntent, setParsingIntent] = useState(false)
  const [hasParsedInitialIntent, setHasParsedInitialIntent] = useState(false)

  const handleParseIntent = async (overrideDescription?: string) => {
    const descToParse = overrideDescription ?? intentDescription
    if (!descToParse.trim() || parsingIntent) return
    setParsingIntent(true)
    try {
      const res = await fetch("/api/ai/parse-automation-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descToParse })
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        // Pre-fill wizard based on AI response
        if (data.trigger_value) {
           const parsedTriggers = data.trigger_value === "ALL" || data.trigger_value === "ALL_COMMENTS" 
             ? [] 
             : data.trigger_value.split(",").map((t: string) => t.trim()).filter(Boolean)
           setTriggers(parsedTriggers)
        }
        if (data.response_type && ["text", "card", "media"].includes(data.response_type)) {
           setType(data.response_type)
        }
        if (data.draft_response_content) {
           setMessageText(data.draft_response_content)
        }
        toast.success("Form pre-filled based on your description!")
      }
    } catch {
      toast.error("Failed to parse your description")
    }
    setParsingIntent(false)
  }

  useEffect(() => {
    if (initialIntent && !hasParsedInitialIntent) {
      setHasParsedInitialIntent(true)
      handleParseIntent(initialIntent)
    }
  }, [initialIntent, hasParsedInitialIntent])

  useEffect(() => {
    fetch("/api/user/connections")
      .then(res => res.json())
      .then(data => {
        if (data.connections && data.connections.length > 0) {
          const platforms = data.connections.map((c: any) => c.platform)
          const available = new Set<string>(["instagram"])
          if (platforms.includes("messenger")) available.add("messenger")
          if (platforms.includes("facebook") && platforms.length > 1) available.add("facebook")
          if (platforms.includes("telegram")) available.add("telegram")
          setAvailablePlatforms(Array.from(available))
        }
      })
      .catch(console.error)
  }, [])

  const handleResolveMediaUrl = async () => {
    if (!specificMediaUrl.trim()) return
    setResolvingUrl(true)
    try {
      const res = await fetch("/api/instagram/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: specificMediaUrl, userId })
      })
      const data = await res.json()
      if (data.id) {
        setSelectedReel({ id: data.id, caption: "Post from URL", image_url: data.image_url || null, media_type: data.media_type || "POST" })
        setHasSelectedReelOption(true)
        toast.success("Post linked!")
      } else {
        toast.error("Could not find post. Make sure the URL is public.")
      }
    } catch {
      toast.error("Failed to resolve URL")
    }
    setResolvingUrl(false)
  }

  const handleGenerateKeywords = async () => {
    if (!triggers.length || generatingKeywords) return
    setGeneratingKeywords(true)
    try {
      const res = await fetch("/api/ai/keyword-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationId: editRule?.id, keywords: triggers.join(", ") })
      })
      const data = await res.json()
      if (data.suggestion) {
        setKeywordSuggestions([data.suggestion])
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch {
      toast.error("Failed to generate keywords")
    }
    setGeneratingKeywords(false)
  }

  const handleAcceptKeywords = async (suggestion: {id?: string, text: string}) => {
    const newKeywords = suggestion.text.split(",").map(k => k.trim()).filter(Boolean)
    setTriggers(newKeywords)
    setKeywordSuggestions([])
    if (suggestion.id) {
      fetch("/api/ai/keyword-suggestion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: suggestion.id, accepted: true })
      }).catch(console.error)
    }
  }

  const handleGenerateCopy = async () => {
    if (!messageText || generatingCopy) return
    setGeneratingCopy(true)
    try {
      const res = await fetch("/api/ai/copy-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationId: editRule?.id, text: messageText })
      })
      const data = await res.json()
      if (data.suggestions) {
        setCopySuggestions(data.suggestions)
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch {
      toast.error("Failed to generate copy")
    }
    setGeneratingCopy(false)
  }

  const handleAcceptCopy = async (suggestion: {id?: string, text: string}) => {
    setMessageText(suggestion.text)
    setCopySuggestions([])
    if (suggestion.id) {
      fetch("/api/ai/copy-suggestion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId: suggestion.id, accepted: true })
      }).catch(console.error)
    }
  }

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoadingReels(true)
    fetch(`/api/instagram/media?userId=${userId}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        const list = j.data && Array.isArray(j.data) ? j.data : Array.isArray(j) ? j : []
        setReels(list)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingReels(false))
    return () => { cancelled = true }
  }, [userId])

  /* Prefill on edit */
  useEffect(() => {
    if (!editRule) return
    const content: any =
      typeof editRule.response_content === "string"
        ? JSON.parse(editRule.response_content as any)
        : editRule.response_content || {}

    setName(editRule.name)
    if (["mention", "reaction", "reply"].includes(editRule.trigger_type)) {
      setStoryTriggerType(editRule.trigger_type as any)
    }
    const rawTriggers = (editRule.trigger_value || "")
      .split(",").map((t) => t.trim())
      .filter((t) => t && !["ALL", "ALL_COMMENTS", "ALL_MENTIONS", "ALL_REACTIONS"].includes(t.toUpperCase()))
    setTriggers(rawTriggers)

    if (content.media?.url) {
      setType("media"); setMediaUrl(content.media.url); setMediaType(content.media.type || "image"); setMessageText(content.message || "")
    } else if (content.card) {
      setType("card"); setCardTitle(content.card.title || ""); setCardSubtitle(content.card.subtitle || ""); setCardImage(content.card.image_url || "")
      setCardStyle(content.card.card_style || "modern")
      setButtons((content.card.buttons || []).map((b: any, i: number) => ({ id: `${Date.now()}_${i}`, ...b })))
    } else {
      setType("text"); setMessageText(content.message || "")
    }
    setQuickReplies((content.quick_replies || []).map((q: any, i: number) => ({ id: `${Date.now()}_qr${i}`, title: q.title, payload: q.payload })))
    setReplyMode(content.reply_mode || "both")
    setPublicReplies(content.public_replies || [])
    setIncludeReplies(!!content.include_replies)
    setCheckFollow(!!content.check_follow)
    setDelaySeconds(content.delay_seconds || 0)
    setTypingIndicator(!!content.typing_indicator)
    
    if (content.lead_capture) {
      setCaptureEmail(!!content.lead_capture.require_email)
      setCaptureName(!!content.lead_capture.require_name)
      setCapturePhone(!!content.lead_capture.require_phone)
    }
    
    setPlatform(editRule.platform || "instagram")
    
    if (editRule.specific_media_id) {
      setSelectedReel({ id: editRule.specific_media_id, caption: "Selected post" })
      setHasSelectedReelOption(true)
    } else {
      setHasSelectedReelOption(false)
    }

    setVariants((editRule.automation_variants || []).map((v: any) => ({
      id: v.id,
      text: v.response_config?.message || v.response_config?.reply_text || "Variant message",
      weight: v.traffic_weight || 50
    })))
    
    if ((editRule as any).platform) {
      setPlatform((editRule as any).platform)
    }
  }, [editRule])

  /* Auto name */
  useEffect(() => {
    if (name || isEditing) return
    const isReplyAll = triggerSource === "comment" && triggers.length === 0
    if (isReplyAll) setName("Reply to every comment")
    else if (triggers.length > 0) setName(`Reply to "${triggers[0]}"`)
  }, [triggers, name, isEditing, triggerSource])

  /* ---------- helpers ---------- */
  const addButton = () => {
    if (buttons.length >= 3) return
    setButtons([...buttons, { id: Date.now().toString(), type: "web_url", title: "", url: "", payload: "" }])
  }
  const updateButton = (id: string, field: keyof ProButton, value: string) =>
    setButtons(buttons.map((b) => (b.id === id ? { ...b, [field]: value } : b)))
  const removeButton = (id: string) => setButtons(buttons.filter((b) => b.id !== id))

  const addQuickReply = () => {
    if (quickReplies.length >= 4) return
    setQuickReplies([...quickReplies, { id: Date.now().toString(), title: "" }])
  }
  const updateQuickReply = (id: string, title: string) =>
    setQuickReplies(quickReplies.map((q) => (q.id === id ? { ...q, title } : q)))
  const removeQuickReply = (id: string) => setQuickReplies(quickReplies.filter((q) => q.id !== id))

  const needsKeywords = triggerSource === "dm" || (triggerSource === "story" && storyTriggerType !== "mention")

  const whenValid = triggerSource === "comment" 
    ? hasSelectedReelOption // Comment trigger is valid once they select a specific post or global option
    : !needsKeywords || triggers.length > 0

  const thenValid =
    replyMode === "public_only" ||
    (type === "text" ? messageText.trim().length > 0 : type === "card" ? cardTitle.trim().length > 0 : mediaUrl.trim().length > 0)
  const canSave = whenValid && thenValid && name.trim().length > 0

  const stepValid = [
    whenValid,  // step 0
    thenValid,  // step 1
    name.trim().length > 0, // step 2
  ]

  /* Plain-language summary sentence */
  const summary = useMemo(() => {
    const isReplyAll = triggerSource === "comment" && triggers.length === 0
    const who =
      triggerSource === "comment"
        ? isReplyAll ? "anyone comments on your post" : `someone comments ${triggers.length ? `"${triggers[0]}"` : "a keyword"}`
        : triggerSource === "dm"
          ? `someone DMs you ${triggers.length ? `"${triggers[0]}"` : "a keyword"}`
          : storyTriggerType === "mention" ? "someone mentions you in a story"
            : storyTriggerType === "reaction" ? "someone reacts to your story"
              : "someone replies to your story"
    const what =
      replyMode === "public_only" ? "reply publicly"
        : type === "card" ? "send them a card with buttons"
          : type === "media" ? `send them ${mediaType === "image" ? "an image" : `a ${mediaType}`}`
            : "send them a DM"
    return { who, what }
  }, [triggerSource, triggers, storyTriggerType, replyMode, type, mediaType])

  /* ---------- save ---------- */
  const handleSubmit = async () => {
    if (!canSave || saving) return
    setSaving(true)

    const isReplyAll = triggerSource === "comment" && triggers.length === 0

    const content: any = { check_follow: checkFollow }
    if (delaySeconds > 0) content.delay_seconds = delaySeconds
    if (typingIndicator) content.typing_indicator = true
    
    if (captureEmail || captureName || capturePhone) {
      content.lead_capture = {
        require_email: captureEmail,
        require_name: captureName,
        require_phone: capturePhone
      }
    }

    if (triggerSource === "comment") {
      content.reply_mode = replyMode
      if (publicReplies.length > 0) content.public_replies = publicReplies
      if (includeReplies) content.include_replies = true
    }
    if (quickReplies.filter((q) => q.title.trim()).length > 0) {
      content.quick_replies = quickReplies.filter((q) => q.title.trim()).map((q) => ({ title: q.title.trim(), payload: q.payload }))
    }

    if (type === "text") {
      content.message = messageText
    } else if (type === "media") {
      if (mediaUrl && !mediaUrl.startsWith("https://")) {
        toast.error("Media URL must use a secure HTTPS link.")
        setSaving(false)
        return
      }
      content.media = { type: mediaType, url: mediaUrl.trim() }
      if (messageText.trim()) content.message = messageText
    } else {

      const cleanButtons = buttons
        .map((b) => {
          if (b.type === "web_url") {
            let cleanUrl = b.url?.trim() || ""
            if (cleanUrl.startsWith("https://https://")) cleanUrl = cleanUrl.replace("https://https://", "https://")
            return { type: "web_url" as const, title: b.title, url: cleanUrl }
          }
          return { type: "postback" as const, title: b.title, payload: b.payload }
        })
        .filter((b) => b.title)
      content.card = { title: cardTitle, subtitle: cardSubtitle || undefined, image_url: undefined, buttons: cleanButtons, card_style: cardStyle }
    }

    const payload = {
      userId,
      name,
      trigger_source: triggerSource,
      trigger_type: isReplyAll ? "reply_all" : triggerSource === "story" ? storyTriggerType : "keyword",
      trigger_value: isReplyAll ? "ALL_COMMENTS"
        : triggerSource === "story" && storyTriggerType === "mention" ? "ALL_MENTIONS"
          : triggerSource === "story" && storyTriggerType === "reaction" && triggers.length === 0 ? "ALL_REACTIONS"
            : triggers.length > 0 ? triggers.join(", ") : "ALL",
      content,
      specific_media_id: selectedReel?.id || null,
      platform,
      automation_variants: variants.map(v => ({
        id: v.id.startsWith("new_") ? undefined : v.id,
        response_config: { message: v.text },
        traffic_weight: v.weight
      }))
    }

    try {
      const res = await fetch("/api/automations", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { ...payload, id: editRule!.id } : payload),
      })
      if (res.ok) {
        toast.success(isEditing ? "Automation updated" : "Automation is live")
        onSuccess()
      } else {
        const errorData = await res.json().catch(() => ({}))
        toast.error(errorData.error || "Could not save — try again")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ── AI Intent Builder ── */}
      <div className="bg-neutral-900/60 border border-white/5 rounded-2xl p-4 md:px-8">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ffe14d]" /> Describe what you want
          </label>
          <p className="text-xs text-neutral-400">
            Tell our AI what you want to automate (e.g., "when people comment 'price', send them my price list") and we'll set up the form for you.
          </p>
          <div className="flex gap-2 mt-2">
            <input
              value={intentDescription}
              onChange={(e) => setIntentDescription(e.target.value)}
              placeholder="Describe your automation..."
              className="flex-1 h-10 bg-white/[0.02] border border-white/10 rounded-xl px-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#ffe14d]/50 transition-all"
              onKeyDown={(e) => e.key === "Enter" && handleParseIntent()}
            />
            <button
              type="button"
              onClick={() => handleParseIntent()}
              disabled={!intentDescription.trim() || parsingIntent}
              className="h-10 px-6 rounded-xl bg-[#ffe14d]/10 hover:bg-[#ffe14d]/20 text-[#ffe14d] text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {parsingIntent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Auto-fill"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Sexy Stepper Timeline ── */}
      <div className="relative bg-neutral-900/60 border border-white/5 rounded-2xl p-4 md:px-8">
        <div className="flex items-center justify-between gap-4 relative">
          {STEPS.map((s, i) => {
            const isActive = i === step
            const isCompleted = i < step
            return (
              <div key={s.key} className="flex items-center gap-3 flex-1 last:flex-initial">
                <button
                  type="button"
                  onClick={() => { if (i < step || stepValid[step]) setStep(i) }}
                  className="flex items-center gap-3 group text-left focus:outline-none"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#ffe14d] text-black shadow-[0_0_15px_rgba(255,225,77,0.3)]"
                      : isActive
                        ? "bg-white text-black ring-4 ring-white/10"
                        : "bg-neutral-800 text-neutral-500 border border-white/5"
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : i + 1}
                  </div>
                  <div className="hidden md:block">
                    <p className={`text-xs font-bold tracking-tight uppercase ${isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                      {s.label}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono-ui">{s.sub}</p>
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-[2px] mx-2 relative bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 transition-all duration-500 bg-[#ffe14d] ${
                      isCompleted ? "w-full" : "w-0"
                    }`} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Two Column Workspace ── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* ── LEFT: Config Form ── */}
        <div className="bg-[#0b0b0a] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
          {/* ===== STEP 1: TRIGGER ===== */}
          {step === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <StepHeader
                number={1}
                title={triggerSource === "comment" ? "Select the target post/reel" : triggerSource === "dm" ? "When someone DMs you" : "When someone interacts with your story"}
                description={triggerSource === "comment" ? "Choose the specific media to automate." : "Set the conditions that launch this automation."}
              />

              {triggerSource === "story" && (
                <div className="space-y-3">
                  <FieldLabel>Select Story Interaction Type</FieldLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {([
                      { key: "mention" as const, icon: <AtSign className="w-5 h-5" />, label: "Mentions me", desc: "Tagged in a story" },
                      { key: "reaction" as const, icon: <Heart className="w-5 h-5" />, label: "Reacts", desc: "Sends emoji reaction" },
                      { key: "reply" as const, icon: <MessageSquare className="w-5 h-5" />, label: "Replies", desc: "Text reply to story" },
                    ]).map(({ key, icon, label, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStoryTriggerType(key)}
                        className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all duration-200 ${
                          storyTriggerType === key
                            ? "border-[#ffe14d] bg-[#ffe14d]/[0.06] text-[#ffe14d]"
                            : "border-white/10 text-neutral-400 hover:border-white/20 hover:text-white bg-white/[0.01]"
                        }`}
                      >
                        <span className={storyTriggerType === key ? "text-[#ffe14d]" : "text-neutral-500"}>{icon}</span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
                          <p className="text-[10px] text-neutral-500 font-normal mt-0.5">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {triggerSource === "comment" && (
                <div className="space-y-4">
                  <FieldLabel>Automate which post or reel?</FieldLabel>
                  

                  {loadingReels ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-3 border border-white/5 rounded-2xl bg-white/[0.01]">
                      <Loader2 className="w-6 h-6 animate-spin text-[#ffe14d]" />
                      <span className="text-xs text-neutral-500 font-mono-ui">Fetching Instagram feed...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {/* Option: Global Post Rule */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReel(null)
                          setHasSelectedReelOption(true)
                        }}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-4 text-center transition-all duration-200 ${
                          hasSelectedReelOption && selectedReel === null
                            ? "border-[#ffe14d] bg-[#ffe14d]/[0.06] text-[#ffe14d]"
                            : "border-white/10 text-neutral-400 hover:border-white/20 hover:text-white bg-white/[0.01]"
                        }`}
                      >
                        <Globe className="w-8 h-8 mb-2 opacity-80" />
                        <span className="text-xs font-bold">All Posts & Reels</span>
                        <span className="text-[9px] text-neutral-500 mt-1">Global Trigger</span>
                      </button>

                      {reels.map((reel) => {
                        const isSelected = hasSelectedReelOption && selectedReel?.id === reel.id
                        return (
                          <button
                            key={reel.id}
                            type="button"
                            onClick={() => {
                              setSelectedReel(reel)
                              setHasSelectedReelOption(true)
                            }}
                            className={`aspect-square rounded-xl border overflow-hidden relative group text-left transition-all duration-200 ${
                              isSelected
                                ? "border-[#ffe14d] ring-2 ring-[#ffe14d]/20"
                                : "border-white/10 hover:border-white/25 bg-[#0e0e0e]"
                            }`}
                          >
                            {reel.image_url ? (
                              <img src={reel.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                            ) : (
                              <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                                <Film className="w-6 h-6 text-neutral-600" />
                              </div>
                            )}

                            {/* Type Overlay */}
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[8px] font-mono-ui text-white uppercase tracking-wider">
                              {reel.media_type === "STORY" ? "Story" : reel.media_type === "VIDEO" ? "Reel" : "Post"}
                            </span>

                            {/* Selected Check overlay */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#ffe14d]/10 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="w-8 h-8 rounded-full bg-[#ffe14d] text-black flex items-center justify-center shadow-lg">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              </div>
                            )}

                            {/* Caption snippet at bottom */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6">
                              <p className="text-[10px] text-white line-clamp-1 font-sans">{reel.caption || "Untitled"}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Specific URL Fallback */}
                  <div className="flex gap-2 items-center">
                    <input
                      value={specificMediaUrl}
                      onChange={(e) => setSpecificMediaUrl(e.target.value)}
                      placeholder="Or paste post URL if missing..."
                      className="flex-1 h-9 bg-white/[0.02] border border-white/10 rounded-xl px-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#ffe14d]/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleResolveMediaUrl}
                      disabled={!specificMediaUrl.trim() || resolvingUrl}
                      className="h-9 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all disabled:opacity-50"
                    >
                      {resolvingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Link"}
                    </button>
                  </div>
                </div>
              )}

              {/* Configure keywords only after selection (for Comment triggers) or always for others */}
              {(triggerSource !== "comment" || hasSelectedReelOption) && (
                <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                  {triggerSource === "comment" ? (
                    <div className="space-y-2">
                      <FieldLabel>Keywords to match</FieldLabel>
                      <p className="text-[11px] text-neutral-500">
                        What keyword triggers this DM? <span className="text-[#ffe14d] font-semibold">Keep empty to reply to every comment.</span>
                      </p>
                      <TagInput
                        value={triggers}
                        onChange={setTriggers}
                        placeholder="type keyword, press Enter (e.g. guide)"
                      />
                      {triggers.length > 0 && (
                        <div className="mt-2">
                          <button 
                            type="button" 
                            onClick={handleGenerateKeywords} 
                            disabled={generatingKeywords}
                            className="flex items-center gap-1.5 text-xs text-[#ffe14d] hover:text-[#ffe14d]/80 transition-colors bg-[#ffe14d]/10 px-3 py-1.5 rounded-full disabled:opacity-50"
                          >
                            {generatingKeywords ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            Improve with AI
                          </button>
                          
                          {keywordSuggestions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {keywordSuggestions.map((s, i) => (
                                <div key={i} className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                                  <p className="text-xs text-neutral-300 font-mono-ui break-words">{s.text}</p>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => handleAcceptKeywords(s)} className="text-[10px] uppercase font-bold tracking-wider text-black bg-[#ffe14d] px-3 py-1.5 rounded-md hover:bg-[#ffe14d]/90">Apply</button>
                                    <button type="button" onClick={() => setKeywordSuggestions([])} className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-white/5 px-3 py-1.5 rounded-md hover:text-white">Dismiss</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : needsKeywords ? (
                    <div className="space-y-2 bg-neutral-900/40 p-5 rounded-2xl border border-white/5">
                      <FieldLabel>
                        {triggerSource === "story" && storyTriggerType === "reaction"
                          ? "Only react on these emojis"
                          : "Trigger keywords"}
                      </FieldLabel>
                      <p className="text-[11px] text-neutral-500 mb-3">
                        {triggerSource === "story" && storyTriggerType === "reaction"
                          ? "Leave empty to trigger on any emoji reaction."
                          : "Matches exact phrases or words (case-insensitive)."}
                      </p>
                      <TagInput
                        value={triggers}
                        onChange={setTriggers}
                        placeholder={
                          triggerSource === "story" && storyTriggerType === "reaction" ? "e.g. ❤️, 🔥, 👍" : "type keyword, press Enter (e.g. price)"
                        }
                      />
                      {triggers.length > 0 && (
                        <div className="mt-2">
                          <button 
                            type="button" 
                            onClick={handleGenerateKeywords} 
                            disabled={generatingKeywords}
                            className="flex items-center gap-1.5 text-xs text-[#ffe14d] hover:text-[#ffe14d]/80 transition-colors bg-[#ffe14d]/10 px-3 py-1.5 rounded-full disabled:opacity-50"
                          >
                            {generatingKeywords ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            Improve with AI
                          </button>
                          
                          {keywordSuggestions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {keywordSuggestions.map((s, i) => (
                                <div key={i} className="flex flex-col gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                                  <p className="text-xs text-neutral-300 font-mono-ui break-words">{s.text}</p>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => handleAcceptKeywords(s)} className="text-[10px] uppercase font-bold tracking-wider text-black bg-[#ffe14d] px-3 py-1.5 rounded-md hover:bg-[#ffe14d]/90">Apply</button>
                                    <button type="button" onClick={() => setKeywordSuggestions([])} className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-white/5 px-3 py-1.5 rounded-md hover:text-white">Dismiss</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {triggerSource === "comment" && triggers.length > 0 && (
                    <ToggleRow
                      icon={<MessageSquare className="w-5 h-5" />}
                      title="Check replies to comments"
                      sub="Normally only primary post comments trigger replies"
                      on={includeReplies}
                      onToggle={() => setIncludeReplies(!includeReplies)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 2: RESPONSE ===== */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <StepHeader
                number={2}
                title="Compose response message"
                description="Pick the format and craft the message sent to prospects."
              />

              {triggerSource === "comment" && (
                <div className="space-y-2">
                  <FieldLabel>Flow direction</FieldLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {([
                      { key: "both" as const, label: "Reply + DM" },
                      { key: "public_only" as const, label: "Reply only" },
                      { key: "dm_only" as const, label: "DM only" },
                    ]).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setReplyMode(key)}
                        className={`h-11 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                          replyMode === key ? "border-[#ffe14d] bg-[#ffe14d]/10 text-[#ffe14d]" : "border-white/10 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {triggerSource === "comment" && replyMode !== "dm_only" && (
                <div className="space-y-2 bg-neutral-900/40 p-5 rounded-2xl border border-white/5">
                  <FieldLabel>Public comments rotation</FieldLabel>
                  <p className="text-[11px] text-neutral-500 mb-3">Add multiple phrases. We rotate them dynamically to look human.</p>
                  <TagInput value={publicReplies} onChange={setPublicReplies} placeholder={'e.g. "Sent you a DM!", "Check your inbox!"'} />
                </div>
              )}

              {replyMode !== "public_only" && (
                <div className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <FieldLabel>Direct Message Format</FieldLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {([
                        { key: "text" as const, icon: <MessageCircle className="w-4.5 h-4.5" />, label: "Text Only" },
                        { key: "card" as const, icon: <Link2 className="w-4.5 h-4.5" />, label: "Card / Link" },
                        { key: "media" as const, icon: <ImageIcon className="w-4.5 h-4.5" />, label: "Rich Media" },
                      ]).map(({ key, icon, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setType(key)}
                          className={`p-3 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                            type === key ? "border-[#ffe14d] bg-[#ffe14d]/10 text-[#ffe14d]" : "border-white/10 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {icon}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {type === "text" && (
                    <div className="space-y-2">
                      <FieldLabel>DM Message Text</FieldLabel>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        rows={5}
                        maxLength={1000}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-[#ffe14d]/50 transition-colors"
                        placeholder="Type the message to send in DMs..."
                      />
                      <div className="flex items-center justify-between mt-1">
                        <button 
                          type="button" 
                          onClick={handleGenerateCopy} 
                          disabled={generatingCopy || !messageText}
                          className="flex items-center gap-1.5 text-[11px] text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 px-3 py-1 rounded-full disabled:opacity-50"
                        >
                          {generatingCopy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          Generate AI Alternatives
                        </button>
                        <p className="font-mono-ui text-[10px] text-neutral-600 text-right">{messageText.length}/1000</p>
                      </div>

                      {copySuggestions.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                            <span>AI Suggestions</span>
                            <button type="button" onClick={() => setCopySuggestions([])} className="hover:text-white">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {copySuggestions.map((s, i) => (
                            <div key={i} className="flex flex-col gap-2 bg-purple-900/10 p-3 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                              <p className="text-xs text-neutral-200">{s.text}</p>
                              <div className="flex justify-end">
                                <button type="button" onClick={() => handleAcceptCopy(s)} className="text-[10px] uppercase font-bold tracking-wider text-white bg-purple-600 px-3 py-1.5 rounded-md hover:bg-purple-500">Apply</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {type === "card" && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <FieldLabel>Card configuration</FieldLabel>
                        <div className="flex gap-2 bg-white/[0.02] p-1 rounded-xl w-max border border-white/10 mb-2">
                          {(["modern", "classic", "minimal"] as const).map(style => (
                            <button
                              key={style}
                              type="button"
                              onClick={() => setCardStyle(style)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                cardStyle === style ? "bg-[#ffe14d] text-black" : "text-neutral-500 hover:text-white"
                              }`}
                            >
                              {style}
                            </button>
                          ))}
                        </div>
                        <TextField value={cardTitle} onChange={setCardTitle} placeholder="Card main title" />
                        <TextField value={cardSubtitle} onChange={setCardSubtitle} placeholder="Subtitle description (optional)" />

                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <FieldLabel>Interactive buttons ({buttons.length}/3)</FieldLabel>
                          <button type="button" onClick={addButton} disabled={buttons.length >= 3}
                            className="font-mono-ui text-[11px] text-neutral-400 hover:text-white disabled:opacity-40 flex items-center gap-1 transition-colors">
                            <Plus className="w-3 h-3" /> Add button
                          </button>
                        </div>
                        {buttons.map((btn) => (
                          <div key={btn.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                            <input
                              value={btn.title}
                              onChange={(e) => updateButton(btn.id, "title", e.target.value)}
                              className="h-8 text-xs w-full sm:flex-1 bg-black/20 sm:bg-transparent border border-white/10 sm:border-none rounded-md sm:rounded-none px-2 text-white placeholder:text-neutral-500 focus:outline-none"
                              placeholder="Button label"
                            />
                            <select
                              value={btn.type}
                              onChange={(e) => updateButton(btn.id, "type", e.target.value)}
                              className="h-8 text-[11px] w-full sm:w-auto bg-black border border-white/10 rounded-lg px-2 text-neutral-300 focus:outline-none"
                            >
                              <option value="web_url">Open Link</option>
                              <option value="postback">Trigger Flow</option>
                            </select>
                            <div className="flex gap-2 w-full sm:flex-1">
                              <input
                                value={btn.type === "web_url" ? btn.url : btn.payload}
                                onChange={(e) => updateButton(btn.id, btn.type === "web_url" ? "url" : "payload", e.target.value)}
                                className="h-8 text-xs w-full bg-black/20 sm:bg-transparent border border-white/10 sm:border-none rounded-md sm:rounded-none px-2 text-white placeholder:text-neutral-500 focus:outline-none font-mono"
                                placeholder={btn.type === "web_url" ? "https://link" : "flow_keyword"}
                              />
                              <button type="button" onClick={() => removeButton(btn.id)} className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors shrink-0">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {type === "media" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <FieldLabel>Select File Type</FieldLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {(["image", "video", "audio"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMediaType(m)}
                              className={`h-10 rounded-xl border text-xs font-bold uppercase transition-all ${
                                mediaType === m ? "border-[#ffe14d] bg-[#ffe14d]/10 text-[#ffe14d]" : "border-white/10 text-neutral-400 hover:text-white"
                              }`}
                            >
                              {m === "image" ? "Photo" : m === "video" ? "Video" : "Audio"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <TextField value={mediaUrl} onChange={setMediaUrl} placeholder="Link to public media file (e.g. mp4, jpg)" />
                      <TextField value={messageText} onChange={setMessageText} placeholder="Optional caption message to send after..." />
                    </div>
                  )}

                  {type !== "card" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <FieldLabel>Quick Reply chips ({quickReplies.length}/4)</FieldLabel>
                        <button type="button" onClick={addQuickReply} disabled={quickReplies.length >= 4}
                          className="font-mono-ui text-[11px] text-neutral-400 hover:text-white disabled:opacity-40 flex items-center gap-1 transition-colors">
                          <Plus className="w-3 h-3" /> Add chip
                        </button>
                      </div>
                      {quickReplies.length > 0 && (
                        <div className="space-y-2">
                          {quickReplies.map((q) => (
                            <div key={q.id} className="flex gap-2 items-center">
                              <input
                                value={q.title}
                                onChange={(e) => updateQuickReply(q.id, e.target.value)}
                                maxLength={20}
                                className="h-10 text-xs flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#ffe14d]/50"
                                placeholder='e.g. "Send Details!"'
                              />
                              <button type="button" onClick={() => removeQuickReply(q.id)} className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* A/B Testing Variants */}
                  <div className="space-y-3 pt-2 border-t border-white/5 mt-6">
                    <div className="flex items-center justify-between pb-2">
                      <FieldLabel>A/B Test Variants (Optional)</FieldLabel>
                      <button type="button" onClick={() => setVariants([...variants, { id: "new_" + Date.now(), text: "", weight: 20 }])}
                        className="font-mono-ui text-[11px] text-[#ffe14d] hover:text-[#ffe14d]/80 flex items-center gap-1 transition-colors">
                        <Plus className="w-3 h-3" /> Add Variant
                      </button>
                    </div>
                    {variants.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[11px] text-neutral-500">
                          Default response receives {100 - variants.reduce((sum, v) => sum + (v.weight || 0), 0)}% of traffic.
                        </p>
                        {variants.map((v, i) => (
                          <div key={v.id} className="flex gap-2 items-start bg-neutral-900/40 p-3 rounded-xl border border-white/5">
                            <div className="flex-1 space-y-2">
                              <textarea
                                value={v.text}
                                onChange={(e) => setVariants(variants.map(varnt => varnt.id === v.id ? { ...varnt, text: e.target.value } : varnt))}
                                rows={2}
                                className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-[#ffe14d]/50"
                                placeholder="Alternative message text..."
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-neutral-500 font-mono-ui">Traffic Weight (%)</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={v.weight}
                                  onChange={(e) => setVariants(variants.map(varnt => varnt.id === v.id ? { ...varnt, weight: parseInt(e.target.value) || 0 } : varnt))}
                                  className="w-16 bg-white/[0.02] border border-white/10 rounded px-2 py-1 text-xs text-white"
                                />
                              </div>
                            </div>
                            <button type="button" onClick={() => setVariants(variants.filter(varnt => varnt.id !== v.id))} className="text-neutral-500 hover:text-red-400 p-1 transition-colors mt-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 3: SETTINGS ===== */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <StepHeader
                number={3}
                title="Configure rules & name"
                description="Finalize performance parameters and activate the automation."
              />

              <div className="space-y-2">
                <FieldLabel>Automation identifier name</FieldLabel>
                <TextField value={name} onChange={setName} placeholder='e.g. "Free Ebook Download Trigger"' />
              </div>

              <div className="space-y-4">
                <FieldLabel>Delivery options</FieldLabel>
                <ToggleRow icon={<Lock className="w-5 h-5" />} title="Follow gate required" sub="Only followers get the payload. Non-followers get follow prompt first." on={checkFollow} onToggle={() => setCheckFollow(!checkFollow)} />
                <ToggleRow icon={<Eye className="w-5 h-5" />} title="Mimic active typing status" sub="Displays typing bubble indicators to look completely organic." on={typingIndicator} onToggle={() => setTypingIndicator(!typingIndicator)} />
                
                <FieldLabel>Lead Capture Sequence (Pre-Delivery)</FieldLabel>
                <ToggleRow icon={<AtSign className="w-5 h-5" />} title="Ask for Email" sub="Capture the user's email address before sending the payload." on={captureEmail} onToggle={() => setCaptureEmail(!captureEmail)} />
                <ToggleRow icon={<Phone className="w-5 h-5" />} title="Ask for Phone Number" sub="Capture the user's phone number before sending the payload." on={capturePhone} onToggle={() => setCapturePhone(!capturePhone)} />
                <ToggleRow icon={<Smile className="w-5 h-5" />} title="Ask for Name" sub="Capture the user's name before sending the payload." on={captureName} onToggle={() => setCaptureName(!captureName)} />
                
                <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center border border-white/5">
                      <Timer className="w-4.5 h-4.5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Randomized delivery delay</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Waits before sending to simulate real human delays.</p>
                    </div>
                  </div>
                  <select
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none hover:border-white/20 transition-all cursor-pointer"
                  >
                    <option value={0}>Send Immediately</option>
                    <option value={3}>3s delay</option>
                    <option value={5}>5s delay</option>
                    <option value={10}>10s delay</option>
                    <option value={30}>30s delay</option>
                  </select>
                </div>
              </div>

              {/* Plain-text Summary Panel */}
              <div className="rounded-2xl border border-[#ffe14d]/15 bg-[#ffe14d]/[0.03] p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#ffe14d]" />
                  <span className="text-xs font-mono-ui uppercase tracking-widest text-[#ffe14d] font-bold">Rule Logic Summary</span>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  When <span className="text-white font-semibold underline decoration-[#ffe14d]/40 decoration-2">{summary.who}</span>, 
                  {delaySeconds > 0 ? ` after a ${delaySeconds}s delay` : ""}
                  {typingIndicator ? ` (with typing indicator)` : ""}
                  {checkFollow ? ` if they follow you` : ""}
                  , we will <span className="text-[#ffe14d] font-semibold">{summary.what}</span>.
                </p>
              </div>
            </div>
          )}

          {/* ── Wizard Foot Navigation ── */}
          <div className="flex items-center justify-between border-t border-white/5 pt-6">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 h-11 px-5 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-white/25 font-mono-ui text-xs font-bold transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : <div />}

            {step < 2 ? (
              <button
                type="button"
                onClick={() => { if (stepValid[step]) setStep(step + 1) }}
                disabled={!stepValid[step]}
                className="flex items-center gap-2 h-11 px-6 rounded-full bg-white text-black font-mono-ui text-xs font-bold hover:bg-[#ffe14d] hover:shadow-[0_0_20px_rgba(255,225,77,0.25)] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSave || saving}
                className="flex items-center justify-center gap-2 h-11 px-8 rounded-full bg-[#ffe14d] text-black font-mono-ui text-sm font-bold hover:brightness-95 hover:shadow-[0_0_25px_rgba(255,225,77,0.35)] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
              >
                {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Zap className="w-4 h-4 stroke-[2.5]" />}
                {saving ? "Saving Changes..." : isEditing ? "Save Automation" : "Go Live"}
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: iPhone Mockup ── */}
        {replyMode !== "public_only" && (
          <div className="hidden lg:block sticky top-6">
            <div className="text-center mb-3">
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold">Interactive Preview</span>
            </div>
            
            {/* iPhone Outer Frame */}
            {/* iPhone Outer Frame */}
            <div 
              className="w-[320px] h-[580px] rounded-[3rem] border-8 border-[#1f1f1e] bg-black shadow-2xl relative flex flex-col overflow-hidden ring-1 ring-white/10 transition-transform duration-500 hover:scale-[1.02] hover:-rotate-1 hover:shadow-[0_20px_50px_rgba(255,225,77,0.15)] group"
              style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
            >
              
              {/* Status Bar Mockup */}
              <div className="h-12 flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-white/90 z-40 select-none relative">
                <span className="w-14 text-center flex items-center justify-center">9:41</span>
                
                {/* Dynamic Island */}
                <div className="w-[120px] h-[32px] bg-black rounded-full z-50 flex items-center justify-between px-2.5 shadow-sm border border-white/5 ring-1 ring-black absolute left-1/2 -translate-x-1/2 top-2.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800" />
                   <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-neutral-900/50" />
                </div>

                <div className="flex items-center gap-1.5 w-14 justify-center">
                  <svg viewBox="0 0 18 12" className="w-3.5 h-3 fill-current opacity-90"><path d="M1 9h2V3H1v6zm3 0h2V1H4v8zm3 0h2V6H7v3zm3 0h2V4h-2v5zm3 0h2V7h-2v2z"/></svg>
                  <svg viewBox="0 0 16 12" className="w-3.5 h-3 fill-current opacity-90"><path d="M8 2.2C5.5 2.2 3.3 3.3 1.8 4.9L8 11.8 14.2 4.9C12.7 3.3 10.5 2.2 8 2.2zM8 0c3.2 0 6 1.4 8 3.5L8 12 0 3.5C2 1.4 4.8 0 8 0z"/></svg>
                  <div className="w-5 h-2.5 border border-white/40 rounded-[4px] p-[1px] flex items-center relative">
                    <div className="w-[80%] h-full bg-white rounded-[2px]" />
                    <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[2px] h-1 bg-white/40 rounded-r-sm" />
                  </div>
                </div>
              </div>

              {/* True-to-life Instagram DM Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black sticky top-0 z-40 mt-0">
                <div className="flex items-center gap-3">
                  <ArrowLeft className="w-5 h-5 text-white cursor-pointer -ml-1" />
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800">
                        <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-white uppercase">
                          {(editRule?.name || "T").substring(0,1)}
                        </div>
                      </div>
                      <div className="absolute bottom-0 -right-0.5 w-3 h-3 bg-[#31a24c] rounded-full border-2 border-black" />
                    </div>
                    <div className="leading-tight flex flex-col justify-center">
                      <div className="flex items-center gap-1">
                        <p className="text-[14px] font-semibold text-white tracking-tight">
                          {userId ? "test_creator" : "creator"}
                        </p>
                        <svg className="w-3 h-3 text-[#0095F6] fill-current" viewBox="0 0 24 24">
                          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.9 14.7L6 12.6l1.5-1.5 2.6 2.6 6.4-6.4 1.5 1.5-7.9 7.9z" />
                        </svg>
                      </div>
                      <p className="text-[12px] text-neutral-500 font-medium tracking-tight">Active now</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-white pr-1">
                  <Phone className="w-5 h-5" />
                  <Video className="w-6 h-6" />
                </div>
              </div>

              {/* Screen Body */}
              <div className="flex-1 bg-black px-3 py-4 space-y-4 overflow-y-auto font-sans flex flex-col justify-end">
                {/* Incoming bubble */}
                <div className="flex justify-start items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] text-white shrink-0">U</div>
                  <div className="bg-[#262626] text-white rounded-2xl rounded-bl-sm px-4 py-2.5 text-[14px] max-w-[75%] leading-snug">
                    {incomingMsg(triggerSource, triggers)}
                  </div>
                </div>

                {/* Typing indicator simulator */}
                {typingIndicator && (
                  <div className="flex justify-end pr-1 animate-pulse">
                    <span className="text-[9px] text-neutral-500 font-mono-ui italic">typing indicator active...</span>
                  </div>
                )}

                {/* Lead Capture Sequence Simulator */}
                {captureName && (
                  <>
                    <div className="flex justify-end items-end gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                      <div className="bg-[#0095F6] text-white rounded-2xl rounded-br-sm px-4 py-2 text-[14px] max-w-[80%] leading-snug">
                        What is your name?
                      </div>
                    </div>
                    <div className="flex justify-start items-end gap-2">
                      <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] text-white shrink-0">U</div>
                      <div className="bg-[#262626] text-white rounded-2xl rounded-bl-sm px-4 py-2.5 text-[14px] max-w-[75%] leading-snug">
                        John Doe
                      </div>
                    </div>
                  </>
                )}
                
                {captureEmail && (
                  <>
                    <div className="flex justify-end items-end gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                      <div className="bg-[#0095F6] text-white rounded-2xl rounded-br-sm px-4 py-2 text-[14px] max-w-[80%] leading-snug">
                        What is your email address?
                      </div>
                    </div>
                    <div className="flex justify-start items-end gap-2">
                      <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] text-white shrink-0">U</div>
                      <div className="bg-[#262626] text-white rounded-2xl rounded-bl-sm px-4 py-2.5 text-[14px] max-w-[75%] leading-snug">
                        john@example.com
                      </div>
                    </div>
                  </>
                )}

                {/* Outgoing Reply Bubble */}
                {hasDMContent(type, messageText, cardTitle, mediaUrl) ? (
                  <div className="flex justify-end items-end gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-w-[80%] space-y-1.5 flex flex-col items-end">
                      {type === "text" && (
                        <div className="bg-[#0095F6] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[14px] whitespace-pre-wrap break-words leading-snug">
                          {messageText || "Type message content..."}
                        </div>
                      )}
                      {type === "card" && (
                        <div className="flex flex-col gap-1.5 w-full items-end">
                           <div className="bg-[#262626] rounded-2xl rounded-br-sm w-[85%] overflow-hidden border border-white/10 shadow-sm flex flex-col">
                             {/* Card Image Area (Placeholder if empty) */}
                             {cardImage ? (
                               <img src={cardImage} alt="Card Preview" className="w-full h-32 object-cover" />
                             ) : (
                               <div className="w-full h-32 bg-neutral-800 flex items-center justify-center">
                                 <ImageIcon className="w-8 h-8 text-neutral-600" />
                               </div>
                             )}
                             
                             {/* Text Area */}
                             <div className="p-3">
                               <div className="text-[14px] font-semibold text-white leading-tight">
                                 {cardTitle || "Card Title"}
                               </div>
                               {cardSubtitle && (
                                 <div className="text-[12px] text-neutral-400 mt-1 leading-snug">
                                   {cardSubtitle}
                                 </div>
                               )}
                             </div>

                             {/* Buttons Area */}
                             {buttons.length > 0 ? (
                               <div className="flex flex-col border-t border-white/10">
                                 {buttons.filter((b) => b.title).map((b, idx) => (
                                   <div 
                                     key={b.id} 
                                     onClick={() => { if (b.url) window.open(b.url, "_blank") }}
                                     className={`text-center py-2.5 text-[14px] text-[#0095F6] font-medium hover:bg-white/5 cursor-pointer transition-colors ${idx > 0 ? 'border-t border-white/10' : ''}`}
                                   >
                                     {b.title}
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <div className="border-t border-white/10 text-center py-2.5 text-[14px] text-neutral-500 font-medium italic">
                                 Button Link
                               </div>
                             )}
                           </div>
                        </div>
                      )}
                      {type === "media" && (
                        <div className="bg-neutral-900 border border-white/10 rounded-2xl w-40 h-40 overflow-hidden flex items-center justify-center relative group shadow-xl">
                          {mediaType === "image" && mediaUrl.startsWith("http") ? (
                            <img src={mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-neutral-500">
                              <ImageIcon className="w-6 h-6" />
                              <span className="text-[9px] uppercase font-mono-ui tracking-wider">{mediaType}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {type === "media" && messageText && (
                        <div className="bg-[#0095F6] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-[14px] leading-snug">{messageText}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end animate-pulse">
                    <div className="border border-dashed border-white/15 bg-white/[0.01] rounded-2xl px-4 py-3 text-[10px] text-neutral-500 font-mono-ui italic text-center w-full">
                      Configure step 2 to build payload
                    </div>
                  </div>
                )}

                {/* Quick Reply Pills */}
                {type !== "card" && quickReplies.filter((q) => q.title.trim()).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end pt-2">
                    {quickReplies.filter((q) => q.title.trim()).map((q) => (
                      <span key={q.id} className="border border-[#3797f0] text-[#3797f0] hover:bg-[#3797f0]/5 cursor-pointer rounded-full px-3 py-1 text-[10px] font-bold transition-all">
                        {q.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* iPhone Footer Navigation Bar */}
              <div className="h-14 bg-black flex items-center justify-between px-3 text-white gap-3 pb-4 pt-1 border-t border-white/10">
                <div className="w-8 h-8 rounded-full bg-[#0095F6] flex items-center justify-center shrink-0">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 h-9 bg-[#262626] rounded-full px-4 flex items-center justify-between text-[13px] text-[#A8A8A8]">
                  <span>Message...</span>
                  <div className="flex items-center gap-3 text-white">
                    <Mic className="w-4 h-4 opacity-80" />
                    <svg aria-label="Sticker" className="w-5 h-5 opacity-80 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  </div>
                </div>
                <PicIcon className="w-6 h-6 shrink-0 opacity-90" />
              </div>

              {/* iPhone Bottom Bar Indicator */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center z-50">
                <div className="w-32 h-1 bg-white/60 rounded-full" />
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Helper renders & string parsers
   ============================================================ */

function incomingMsg(triggerSource: string, triggers: string[]): string {
  const primaryKw = triggers.length > 0 ? triggers[0] : null
  if (triggerSource === "comment") {
    return primaryKw ? `Commented "${primaryKw}"` : "Commented on post"
  }
  if (triggerSource === "story") {
    return "Interacted with your Story"
  }
  return primaryKw ? `DMed keyword "${primaryKw}"` : "Sent you a message"
}

function hasDMContent(type: string, messageText: string, cardTitle: string, mediaUrl: string): boolean {
  if (type === "text" && messageText.trim().length > 0) return true
  if (type === "card" && cardTitle.trim().length > 0) return true
  if (type === "media" && mediaUrl.trim().length > 0) return true
  return false
}

function StepHeader({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="border-b border-white/5 pb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="px-2 py-0.5 rounded-md bg-[#ffe14d]/10 border border-[#ffe14d]/25 text-[9px] font-mono-ui font-bold uppercase tracking-wider text-[#ffe14d]">
          Phase {number}
        </div>
      </div>
      <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{description}</p>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono-ui text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-2">{children}</p>
}

function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 bg-white/[0.02] border border-white/10 rounded-xl px-4 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#ffe14d]/50 focus:bg-white/[0.04] transition-all"
    />
  )
}

function ToggleRow({
  icon, title, sub, on, onToggle,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all duration-200 bg-white/[0.01] ${
        on ? "border-[#ffe14d]/40 bg-[#ffe14d]/[0.03]" : "border-white/10 hover:border-white/20"
      }`}
    >
      <span className={on ? "text-[#ffe14d]" : "text-neutral-500"}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-neutral-500 mt-0.5 leading-relaxed">{sub}</span>
      </span>
      <span className={`w-10 h-5.5 rounded-full relative transition-colors shrink-0 ${on ? "bg-[#ffe14d]" : "bg-neutral-800"}`}>
        <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-black shadow-md transition-all ${on ? "left-[20px]" : "left-0.5"}`} />
      </span>
    </button>
  )
}
