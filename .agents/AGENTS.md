# Agent Rules

- **Do not automatically push to or deploy the main branch** unless the user explicitly requests it. Wait for user permission before running `git push` or deployment commands.

---

# Lightweight UI Stack

## Allowed Animation Libraries
- **Zero** — all animations use pure CSS transitions/transforms
- No framer-motion, GSAP, Three.js, OGL, or WebGL in public or dashboard pages
- Use the CSS motion utilities in `globals.css`: `.motion-fade-in`, `.motion-fade-in-up`, `.motion-fade-in-scale`, `.stagger`

## Allowed UI Primitives (Radix UI)
Keep only these Radix packages (pruned from the full shadcn suite):
- `react-dialog` — modals, sheets
- `react-label` — form labels
- `react-select` — dropdown selects
- `react-switch` — toggle switches
- `react-tabs` — tab panels
- `react-toast` — toast notifications
- `react-tooltip` — tooltips
- `react-separator` — dividers
- `react-slot` — composition primitive
- `react-checkbox` — checkboxes

## Deleted Components (do NOT re-add)
- `Ferrofluid`, `AcidSquares`, `GradientWaves` — WebGL shader effects
- `Lanyard` — Three.js + Rapier physics card
- `ElectricBorder` — canvas RAF loop
- `DepthText`, `TextPressure` — RAF text effects
- `PillNav` — GSAP-animated navigation
- `MaskedHeading`, `ScrollFloat`, `CurvedLoop` — GSAP/RAF text animations
- `CardSwap` — framer-motion card stack

## Adding New Components
1. Prefer CSS-only implementations (transitions, transforms, keyframes)
2. If JS animation is absolutely required, keep it under 2KB gzipped
3. Always respect `prefers-reduced-motion`
4. Never add continuous `requestAnimationFrame` loops for visual effects
5. Never add WebGL/Canvas for decorative backgrounds
6. Run `pnpm build` after changes to verify no new heavy deps leak in
