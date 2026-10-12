# Helixa Anti-Vibecode Standard: anti-vibecode.md

Purpose: Enforcement checklist for frontend quality, performance, and credibility across the Helixa codebase. This document details banned anti-patterns and required production practices.

---

## 1. Visual & Graphic Anti-Patterns

- **No Gimmick Animations or Canvas Loops:**
  - Banned: WebGL shaders, Three.js, Rapier physics, continuous `requestAnimationFrame` canvas loops, `Ferrofluid`, `AcidSquares`, `GradientWaves`, `ElectricBorder`, `Lanyard`.
  - All visual transitions must use lightweight pure CSS transforms and transitions (`globals.css`).
- **No Neon Glows or Blurred Halos:**
  - Drop zones do not emit radial neon glows on drag-over; drag-over simply transitions the border from `--line2` to `--goldline`.
  - The tactile primary button uses a subtle `1px` top inner highlight (`inset 0 1px 0 rgba(255,255,255,0.15)`), never outer multi-color glows.
- **No Decorative Serifs or Gradient Text:**
  - Headings are pure `Geist Sans` or `IBM Plex Sans Arabic`.
  - No text-fill gradient masking (`bg-clip-text text-transparent bg-gradient-to-r`).

---

## 2. Copy & Vendor Transparency

- **No Vendor Jargon in Product Chrome:**
  - Do not show names like "Groq", "Llama 3.3 70B Versatile", or "OpenAI Whisper" in general navigation, cards, or user copy.
  - LLM and provider names are permitted strictly inside the BYOK / Model Selector configuration pane.
- **Model Selector Displays Verifiable Facts:**
  - Display latency (ms), price per 1M tokens ($/EGP), and context window size.
  - Do not use arbitrary "speed / intelligence" 5-star or dot ratings.
- **No Unverifiable Hype:**
  - Banned words: "100% automated", "instant", "unlimited", "flawless", "revolutionary".
  - Use calm, specific operator nouns: "24-hour response window", "84% automated resolution rate", "attributable sales".
- **Single Source of Truth for Business Details:**
  - Never hardcode personal phone numbers or developer personal emails in instructions.
  - All billing recipient phone numbers, IBANs, and support addresses must be sourced from environment/config constants.

---

## 3. Data Integrity & Presentation

- **Zero Raw IDs or Unparsed Payloads in UI:**
  - Raw database IDs (e.g., `cnt_31206...`) must never be displayed as customer headers. Fall back to clean usernames or truncated channel badges (`Instagram User · 31206`).
  - Webhook payloads (e.g., `ACT::9e3ad...` or `{"postback_id": ...}`) must be transformed into human-readable timeline events (e.g., *Customer pressed "Track Order"*).
- **Tabular Figures for Numerical Data:**
  - Any table column, KPI, or countdown timer showing numbers must apply tabular figures (`font-mono tabular-nums`) to prevent layout shifts.

---

## 4. State Completeness & Error Resilience

- **4-State Requirement for Every Async View:**
  Every data-fetching component must handle all four states:
  1. *Loading*: Accessible skeleton placeholders (no indefinite center spinners).
  2. *Empty*: Actionable, one-sentence empty state or setup checklist (no dead ends).
  3. *Error*: Clear failure message with a "Retry" button.
  4. *Populated*: Dense, formatted data view.
- **No Native `window.confirm()`:**
  - Native browser alert/confirm dialogues are strictly banned.
  - Use Radix-based `ConfirmDialog` or the 900ms `HoldToConfirmButton` for irreversible actions.

---

## 5. Accessibility & Typography (WCAG AA)

- **Contrast Ratios:**
  - All meaningful text must meet a minimum 4.5:1 contrast against its background surface.
  - `--t3` is set to `#7A7A85` (or higher) to guarantee compliant legibility on `--s1` (`#101013`).
- **Keyboard Navigation & Focus Rings:**
  - Every interactive button, input, and row must render an unambiguous `focus-visible:ring-1 focus-visible:ring-[var(--t1)]`.
  - Full keyboard shortcuts (`⌘K`, `Escape`, arrow key navigation) supported across tables and the command palette.
- **Logical CSS Properties for Bi-Directional Layouts:**
  - Use `ms-*` (margin-inline-start), `me-*` (margin-inline-end), `ps-*`, and `pe-*` rather than hardcoded `left`/`right` coordinates.

---

## 6. Privacy & Third-Party Processors

- Whenever a new tracking service, analytics tool, or payment gateway (Paymob, Vodafone Cash, Stripe) is introduced into the client bundle, the `/privacy` and `/cookies` disclosures must be updated in the same PR.
