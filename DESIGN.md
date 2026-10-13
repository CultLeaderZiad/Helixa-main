# Cyreax DM Design System (dark, restrained gold): DESIGN.md

Purpose: A single canonical reference for humans and coding agents (Cursor, Freebuff, Antigravity). Every screen must adhere to this file and the CSS tokens in `app/globals.css`.

---

## 1. Principles

1. **Operator first.** Dense, scannable, and keyboard-friendly. Show real data; show an empty state only when there is truly nothing.
2. **Gold means Cyreax DM intelligence or "you are here".** Use it strictly for the AI mark, the active nav rail, the selected row, the current plan badge, and the brand mark. Never use it for every CTA.
3. **Client context is always visible.** Agency › Client workspace › page hierarchy.
4. **Arabic is a first-class language, not a translation.** Native RTL message bubbles, Arabic font stack (`Noto Sans Arabic` / `IBM Plex Sans Arabic`), `<bdi>` isolation for mixed text (prices, SKUs, numbers), and dialect labels (`EGY`, `SAU`, `LEV`, `MSA`).
5. **Calm copy (Principles §6).** Calm, specific, no hype, zero exclamation marks, and specific nouns.

---

## 2. Color Tokens

| Token | Hex / Value | Usage |
|---|---|---|
| `--bg` | `#09090B` | Main application canvas |
| `--s1` | `#101013` | Sidebar, primary cards, modals |
| `--s2` | `#151519` | Inputs, nested rows, selected list item |
| `--s3` | `#1B1B20` | Hover states, active nav item, incoming customer bubble |
| `--s4` | `#232329` | Bar tracks, segmented control active pill |
| `--line` | `#222228` | Structural dividing borders |
| `--line2` | `#2C2C33` | Control and input borders |
| `--line3` | `#3A3A42` | Emphasis borders and popover edges |
| `--t1` | `#EDEDEF` | High-contrast primary text, headings, values |
| `--t2` | `#A3A3AD` | Secondary descriptive text, standard labels |
| `--t3` | `#7A7A85` | Metadata, timestamps, non-essential captions (WCAG AA compliant ≥ 4.5:1) |
| `--t4` | `#4A4A53` | Section uppercase labels, disabled text |
| `--gold` | `#D6AE5C` | Brand accent, AI indicator, active rail |
| `--gold2` | `#E9C77E` | Accent text on dark backgrounds |
| `--goldbg` | `rgba(214, 174, 92, 0.10)` | AI bubble background, suggestion chip tint |
| `--goldline` | `rgba(214, 174, 92, 0.28)` | AI borders, selected option borders |
| `--green` | `#3DD68C` | Live status, success badges, positive deltas |
| `--red` | `#F2555A` | Errors, destructive actions, leaks, SLA breach |
| `--amber` | `#F5A524` | Warnings, expiring tokens, pending verification |
| `--blue` | `#6EA8FE` | Unread dot, info states, links in chat threads |
| `--bubble-out` | `#1E2230` | Human agent outbound chat bubble (deep navy) |

### Channel Brand Colors
Instagram (gradient), Facebook (`#1877F2`), WhatsApp (`#25D366`), TikTok (`#000000`), Telegram (`#27A7E7`) appear **strictly** inside the 18px / 32px channel badge. Never use channel colors as button fills or background sweeps.

### Logo
The Cyreax logo renders in flat placement in app chrome: no extra glow, drop-shadow, gradient, or animation on top of the asset. The wordmark reads "CYREAX". Render "DM" as plain text next to it (`BRAND.name` = "Cyreax DM").

---

## 3. Typography

- **UI & Body:** `Geist Sans` (system fallback `Inter`, `-apple-system`, `sans-serif`).
- **Numbers / IDs / Metrics:** `Geist Mono` with tabular numbers (`font-mono`, `tabular-nums`).
- **Arabic Text:** `IBM Plex Sans Arabic`, `Noto Sans Arabic`, `Cairo`.
- **Zero Serifs:** No serif display headings, no decorative italics, and no uppercase mono buttons.

| Role | Size / Weight | Tracking / Line Height | Implementation Notes |
|---|---|---|---|
| Page title (`h1`) | `22px` / 600 | `-0.02em` / 1.25 | Exactly one per page |
| Section title (`h2`) | `14px` / 600 | normal / 1.3 | Card headers & table group headers |
| Body (Latin) | `13px` / 400 | normal / 1.45 | Standard UI text |
| Body (Arabic) | `14px` / 400 | `0` / 1.55 | Arabic requires +1px size & zero letter-spacing |
| Small / Meta | `12px` / 400 | normal / 1.4 | Timestamps, secondary notes (`--t3`) |
| Section label | `11px` / 500 | `+0.06em` / uppercase | Sidebar group headers, drawer rail headings |
| KPI Value | `26px` / 600 | `-0.03em` / tabular-nums | Headline summary numbers |

---

## 4. Spacing, Radii, and Elevation

- **Base 4px Grid:** Common steps: 4, 6, 8, 10, 12, 16, 20, 24, 32px.
- **Page Padding:** Desktop `20px` to `28px`. Card padding: `14px` to `16px`.
- **Border Radii:**
  - Controls & buttons: `6px` (`rounded-md`)
  - Rows & inputs: `8px` (`rounded-lg`)
  - Cards: `12px` (`rounded-xl`)
  - Modals & sheets: `16px` (`rounded-2xl`)
  - Pills & badges: `10px` / full pill
- **Elevation:** Surface hierarchy is communicated through borders (`--line`, `--line2`) and subtle background steps (`--bg` → `--s1` → `--s2`), not heavy drop shadows. Modals and dropdowns use clean, crisp dark elevation (`shadow-2xl shadow-black/80`).

---

## 5. Layout Standards

- **Desktop (1440px viewport):**
  - Sidebar: Fixed `240px`.
  - Top Navigation: `44px` height with breadcrumbs `[Client Workspace] / [Page]` and global `⌘K` trigger.
  - Inbox: `300px` conversation list · Fluid middle chat thread · `320px` Copilot rail.
  - Settings: `210px` sub-navigation · Fluid content with `190px` label column + input rows.
- **Mobile (390px viewport):**
  - Single column with `56px` header.
  - Composer pinned at viewport bottom with `26px` safe area inset.

---

## 6. Components Specification

### 6.1 Buttons (30px Standard)
All buttons have a fixed height of `30px` (or `26px` for compact table actions):
- **Primary CTA:** High-contrast off-white (`bg-[#EDEDEF] text-[#09090B] hover:bg-white active:scale-[0.99]`).
- **Default / Secondary:** Surface 2 with border (`bg-[#151519] border border-[#2C2C33] text-[#EDEDEF] hover:bg-[#1B1B20]`).
- **Ghost:** Transparent background with subtle hover (`hover:bg-[#1B1B20] text-[#A3A3AD] hover:text-[#EDEDEF]`).
- **Gold (Reserved):** Used only for AI execution, reconnecting broken channels, or billing upgrade moments (`bg-[var(--goldbg)] border border-[var(--goldline)] text-[var(--gold)]`).
- **Hold-to-Confirm:** Destructive actions (disconnecting channels, deleting rules) require a 900ms hold press with a red fill indicator and a 5s undo toast.

### 6.2 Status Pills & Badges
Always pair a visual dot or icon with label text—never rely on color alone:
- **Live / Active:** Green dot (`#3DD68C`) + label.
- **Pending / Window SLA:** Amber dot (`#F5A524`) + time remaining (`2h left`).
- **Leak / Error:** Red dot (`#F2555A`) + error count.
- **AI Handled:** Gold spark icon or dot (`#D6AE5C`) + "AI Agent".
- **Dialect Pill:** Blue-tint pill (`EGY العامية`, `SAU الخليجية`).

### 6.3 Chat Bubbles
- **Incoming (Customer):** Surface 3 (`--s3`), left-aligned for Latin, right-aligned with `dir="rtl"` for Arabic.
- **Outgoing (Human Agent):** Deep navy (`#1E2230`), right-aligned.
- **Outgoing (AI Agent):** Gold-tinted bubble (`--goldbg` + `--goldline` border) with header `AI Agent · Dialect`.
- **System Events:** Centered pill outline (`Tapped button "Get price"`).

### 6.4 Copilot Rail
- **Customer Identity:** Name, phone, total spend, lead stage dropdown.
- **AI Live Summary:** 2 concise bullet points summarizing the buyer's intent.
- **Missing Knowledge Prompt:** One-click `[+ Add answer to Knowledge Base]` if customer asked something new.
- **One-Click Actions:** Send Paymob payment link, Confirm COD order, Escalate to human operator.

### 6.5 Egyptian Billing Ticket (Vodafone Cash / InstaPay)
Perforated voucher card with:
- Amount in EGP.
- Masked official wallet number (e.g., `010 2874 9831`).
- Cryptographic reference code (`HLX-EG-89240`) with copy button.
- Receipt drop-zone with file drag-and-drop.
- 4-step linear status track: Sent → Receipt uploaded → Verified → Active.

---

## 7. RTL & Bidirectionality Rules

1. **Root & Chrome Direction:** The operator dashboard layout stays aligned to the operator's preference (`en` or `ar`). When switched to Arabic, the sidebar mirrors to the right and breadcrumbs invert.
2. **Conversation Bubbles:** Every message evaluates direction based on language content. Arabic text is explicitly tagged with `dir="rtl"` and rendered in `IBM Plex Sans Arabic` or `Noto Sans Arabic`.
3. **`<bdi>` Tag Isolation:** Always wrap English product names, order IDs, URLs, and currency amounts within Arabic paragraphs inside `<bdi>` tags to prevent punctuation inversion and scrambled price strings:
   ```html
   <p dir="rtl">
     تم تأكيد طلبك رقم <bdi dir="ltr">#HLX-492</bdi> بمبلغ إجمالي <bdi dir="ltr">EGP 850</bdi>.
   </p>
   ```
4. **No Arabic Letter-Spacing:** Always set `letter-spacing: 0` for Arabic text.

---

## 8. Anti-Vibecode Rules

1. **Zero Gimmicks:** No WebGL, Three.js, shaders, canvas loops, text pressure effects, or neon card glows.
2. **Zero All-Caps Mono:** Standard sentence case for labels and buttons (`Create rule`, not `CREATE RULE`).
3. **No Decorative Serifs:** Do not use serif fonts in product screens.
4. **No Raw Enums or Database IDs:** Never show `cnt_31206...` or `ACT::9e3ad...` to users. Transform all raw events into plain English or Arabic actions.
5. **Calm Copy:** No unprovable marketing claims ("100% automated", "instant", "unlimited").
6. **No Indefinite Spinners:** Every async query must provide clear loading skeletons, populated states, informative empty states, and explicit error recovery.
7. **Strict Contrast:** Secondary text must maintain at least 4.5:1 contrast against its background surface.
