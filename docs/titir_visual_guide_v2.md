# TiTir — Visual Design Guide

**Status:** Part A is **MANDATORY** for anything touching the shell
renderer — it is fixed and load-bearing, some of it shared with the
main process's bounds math (Technical Specification §10), and does not
move. Part B is **RECOMMENDED** — a default, coherent starting point
for a plugin's own interior, not enforced by anything. A plugin that
ignores all of Part B is exactly as legal as one that follows it to the
letter (Plugin Guide §15, Technical Specification §2). If a design
question comes up that isn't answered here, follow the nearest rule by
analogy rather than inventing a new pattern — every value below is a
concrete number or token, not an illustration to approximate.

**Relationship to the other two documents:**

- `titir_technical_specification.md` defines TiTir itself — the
  process model, IPC, the state machine — and is where `NAV_WIDTH`
  (`72`) and `TITLEBAR_HEIGHT` (`40`) are authoritatively decided
  (§10). This guide **does not redefine those two numbers**; it only
  says how the pixels around them are colored and spaced. Where this
  document repeats a number from that one, that document remains the
  source of truth.
- `titir_plugin_guide.md` defines what a plugin is and confirms a
  plugin's own interior is visually FREE (§15). This guide is what you
  reach for *when you choose to use that freedom toward a coherent
  look* — MANDATORY for shell chrome, RECOMMENDED as the default choice
  for a plugin's interior absent a reason not to.
- Neither other document, nor this one, ships or assumes a specific
  component library for plugin authors — Technical Specification §2
  explicitly keeps "any shared UI kit, component library, or state-
  management contract imposed on plugin authors" out of scope. Part B
  below is a **token and spec system**, reproducible in plain CSS
  regardless of framework — not a library TiTir ships or checks for.

---

## 0. How to Use This Document

1. Building shell chrome (navigation column, window-controls row, the
   idle state, the Hub's own slot)? Use **Part A** — TiTir's own fixed
   tokens. These are load-bearing for view-bounds math and must not
   drift.
2. Building a plugin's own interior UI? Use **Part B** — a full,
   self-contained token system you can reproduce in plain CSS, or via
   whatever framework your plugin already uses.
3. Every numeric value below is final. Don't approximate, round, or
   "pick something close" — use the exact token or pixel value given.
4. If two rules conflict, the more specific one wins: a component spec
   in §B7 overrides the general spacing rule in §B1; any Part A rule
   inside the 72px navigation column overrides anything in Part B,
   because nothing in Part B ever applies inside shell chrome.

---

# PART A — Shell Chrome (TiTir Itself)

MANDATORY for anyone building any part of the shell renderer
(`src/renderer/`, per Technical Specification §5). Fixed, load-bearing,
shared in part with main-process bounds math. Do not deviate.

## A1. The Fixed Tokens (`src/renderer/styles.css`, `:root`)

```css
:root {
  --titir-bg: #15161a;
  --titir-surface: #1c1e24;
  --titir-surface-raised: #262931;
  --titir-border: #2e313a;
  --titir-text-primary: #eceef2;
  --titir-text-secondary: #9a9fac;
  --titir-text-tertiary: #6b7080;
  --titir-accent: #5b8cff;
  --titir-danger: #e2564f;
  --titir-radius-sm: 6px;
  --titir-radius-md: 8px;
  --titir-nav-width: 72px;
  --titir-titlebar-height: 40px;
  --titir-icon-size: 28px;
  --titir-icon-hit: 44px;
  --titir-ease: ease-out;
  --titir-duration: 150ms;
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

`--titir-nav-width` (`72`) is the same literal as `NAV_WIDTH` in
`src/main/shared/constants.ts` (Technical Specification §10) — one
value, generated into CSS at boot. Never hardcode `72px` a second time
anywhere in shell code; reference the token/constant. `--titir-
titlebar-height` matches `TITLEBAR_HEIGHT` the same way. `--titir-icon-
size` and `--titir-icon-hit` are renderer-only presentation values —
no main-process bounds math depends on either.

**One theme only, in v1.** The persisted config schema (Technical
Specification §9) has no `theme` field — there is no runtime light/dark
switch to design around, so this token set is the only palette that
exists. If a future revision adds a `theme` field to `ShellConfig`,
this section is where a second palette would be defined; until then,
don't build a theme toggle that has nothing in the config schema to
persist to.

## A2. Layout Geometry — Exact, Non-Negotiable

```
┌───────────┬──────────────────────────────────────────────┐
│ 72px       │ Content area                                  │
│ nav column │ x = 72, y = 0                                  │
│            │ w = winWidth - 72, h = winHeight               │
│ ┌────────┐ │ (this is the active plugin's WebContentsView — │
│ │ 40px   │ │  the shell renderer paints nothing inside it)  │
│ │controls│ │                                                 │
│ ├────────┤ │                                                 │
│ │ plugin │ │                                                 │
│ │  list  │ │                                                 │
│ │(scroll-│ │                                                 │
│ │  able) │ │                                                 │
│ ├────────┤ │                                                 │
│ │  Hub   │ │                                                 │
│ │ (fixed │ │                                                 │
│ │ bottom)│ │                                                 │
│ └────────┘ │                                                 │
└───────────┴──────────────────────────────────────────────┘
```

Navigation column, top to bottom, three stacked regions (Technical
Specification §10):

1. **Window controls row** — height `var(--titir-titlebar-height)`
   (40px), full 72px wide. Background carries
   `-webkit-app-region: drag`; the three control buttons individually
   get `-webkit-app-region: no-drag` (§13 of the technical
   specification). Buttons are CSS-drawn, horizontally laid out,
   left-aligned with 8px left inset and 8px gap between them, each a
   12px-diameter dot. Wired to `window:minimize` / `window:maximize` /
   `window:close` over IPC. No other content lives in this row.
2. **Plugin list** — scrollable, fills the remaining space between the
   controls row and the Hub slot. Vertical stack of icon buttons, each
   a `var(--titir-icon-hit)` (44×44px) hit target centered in the 72px
   column, icon rendered at `var(--titir-icon-size)` (28px) inside it,
   8px vertical gap between items, drag-reorderable (§A4).
   `border-radius: var(--titir-radius-md)` on the hover/active
   background.
3. **Hub slot** — fixed to the bottom, flush, never part of the
   scrollable/reorderable plugin list above it (Plugin Guide §1,
   Technical Specification §10). Renders the Hub's own manifest icon
   at the same `var(--titir-icon-size)`/`var(--titir-icon-hit)` sizing
   as any other nav icon — the Hub is a real mounted plugin like any
   other (Technical Specification §4), not a special avatar widget, so
   it draws from §A4/§A5 below rather than its own rules.

Content area: `{x: 72, y: 0, width: winWidth - 72, height: winHeight}`
when a plugin is visible; `{x: 0, y: 0, width: 0, height: 0}` when
hidden (Technical Specification §8, §10). This is main-process bounds
math (`lifecycle.ts`) — never a CSS layout the renderer computes; the
shell-chrome renderer draws only the 72px column, full stop. It never
paints into the content area and has no loading/empty state to design
**inside** that space beyond the one idle state in §A5 and the one
crash toast in §A6.

## A3. Color Usage Inside Shell Chrome

| Token | Use for |
|---|---|
| `--titir-bg` | Base window background, idle/empty state background |
| `--titir-surface` | Navigation column background |
| `--titir-surface-raised` | Plugin-list item hover/pressed background, window-controls row's very slightly recessed background |
| `--titir-border` | Hairline dividers between the three nav-column regions |
| `--titir-text-primary` | Active plugin's icon, idle-state wordmark |
| `--titir-text-secondary` | Tooltips, idle-state tagline, inactive icon color |
| `--titir-text-tertiary` | Disabled-adjacent or least-emphasized nav-column text (rare) |
| `--titir-accent` | Active plugin's indicator — a 2px left-edge bar, applied consistently, never combined with a second active-state treatment |
| `--titir-danger` | Crashed-icon state, crash-toast accent, Relaunch button is the exception (see §A6) |

## A4. Nav Icon States — Every One, Explicitly

| State | Visual |
|---|---|
| Default | icon at `--titir-text-secondary`, no background |
| Hover | background `--titir-surface-raised`, `--titir-radius-md`, icon → `--titir-text-primary` |
| Active (this plugin currently visible) | icon → `--titir-text-primary`, plus a 2px `--titir-accent` left-edge bar — the one and only active-state treatment (§A3) |
| Pressed / dragging (reorder) | 92% opacity, `cursor: grabbing`, other items animate out of the way over `var(--titir-duration)` `var(--titir-ease)` |
| Disabled (`plugins[].enabled: false`) | not rendered in the list at all — disabled plugins are absent, not grayed out (Technical Specification §9) |
| Crashed | icon at `--titir-danger`, tooltip reads "Crashed — click to relaunch," click re-triggers mount (Technical Specification §14) |

Tooltip on hover for every nav icon: the plugin's `name` from its
manifest, `var(--font-ui)`, 13px, `--titir-text-primary` text on
`--titir-surface`, `--titir-radius-sm` box with a `--titir-border`
outline, 6px vertical / 8px horizontal padding, appears after a
~400ms hover delay, positioned to the right of the nav column with an
8px gap.

## A5. Fallback Icon & the Idle State

**Fallback icon** (no `icon` field in a plugin's manifest — Plugin
Guide §2, §15): a single flat, monochrome glyph using `currentColor`
so it inherits `--titir-text-secondary`/`--titir-text-primary` per the
state table above — a generic outline-square glyph, sized to fill the
28px icon size the same way a supplied icon would.

**Idle/empty state** (Technical Specification §10 — shown in the
content area only before any plugin has ever been clicked): centered
in the content area, PuFi's mascot mark above the "TiTir" wordmark,
tagline below.

- PuFi's mark: monochrome, `--titir-text-secondary` — the idle state
  reads as calm, not a splash screen.
- "TiTir" wordmark: `--titir-text-primary`, `var(--font-ui)`, 20px,
  weight 600.
- Tagline: `--titir-text-secondary`, `var(--font-ui)`, 13px, weight
  400.
- Vertical rhythm between the three: 24px.
- Clear space: at least one mascot-height of empty space around PuFi's
  mark before any other element.
- PuFi appears **only** here in shell chrome — not in the Hub's own
  UI, not in the crash toast (§A6), not anywhere inside a plugin's own
  view. One appearance keeps it a quiet signature rather than a
  repeated element competing with plugin content. Plugin authors do
  not use PuFi's mark inside their own UI, regardless of how FREE
  their interior otherwise is (Plugin Guide §15) — it would misrepresent
  their plugin's content as part of the shell itself.

## A6. The One Thing Shell Chrome Renders Into "Content" — the Crash Toast

Triggered by `titir:pluginCrashed` (Technical Specification §11, §14).
This is the only shell-drawn UI that isn't the 72px nav column or the
idle state. Position: fixed, bottom-right of the **whole window** (not
the content area, not the nav column), 16px inset from both edges.
Box: `--titir-surface`, `--titir-border` outline, `--titir-radius-md`,
12px padding, `box-shadow: 0 4px 12px rgba(0,0,0,0.4)`. Content: the
crashed plugin's `name` + "crashed" in `--titir-text-primary` 14px, a
"Relaunch" text-button in `--titir-accent` 14px/600 beneath it, 8px
gap. Clicking Relaunch re-triggers the mount sequence for that
`pluginId` only (Technical Specification §14). Auto-dismiss is FREE —
not specified — but if added, 6–8 seconds is reasonable; the Relaunch
action must stay reachable for the whole window either way.

## A7. Motion

Exactly one timing pair for shell chrome: `--titir-duration: 150ms`,
`--titir-ease: ease-out`. Use it for the nav-icon hover background
fade, the reorder animation, the toast enter/exit, and the active-
indicator transition. Don't introduce a second easing curve or
duration into shell chrome — consistency here matters more than any
individual transition looking "nicer."

**The one motion this pair never applies to:** switching the active
plugin. Bounds go from `{0,0,0,0}` to full content-area size (or back)
in the same tick (Technical Specification §8, §10) — no cross-fade, no
slide. Animating between two entirely separate `WebContentsView`
processes is unreliable, and the perceived cost of an instant switch is
lower than the complexity of faking a smooth one across process
boundaries.

---

# PART B — Interior UI (Plugin Content)

RECOMMENDED default for a plugin's own interior, not enforced by
anything (Plugin Guide §15, Technical Specification §2). Use this by
default unless your plugin has a stated reason to diverge (a game with
its own art direction, an embed of a third-party app, etc.) — absent
such a reason, this is *the* visual design for plugin interiors on
TiTir, not merely "a" visual design.

Implementation: plain CSS custom properties, reproducible regardless of
framework — TiTir ships no component library for plugin authors to
import (Technical Specification §2). The **values** below are the
contract; how you implement them (hand-rolled CSS, Tailwind config,
CSS-in-JS) is entirely your own choice.

## B1. Spacing Unit

Base unit: `4px`. Every spacing value in this guide is a multiple of
4px. Never use an arbitrary spacing value (5px, 13px, 18px) — round to
the nearest 4px step. Common steps you'll actually use: 4, 8, 12, 16,
20, 24, 32, 40, 48, 64px.

## B2. Typography Scale

Font family: `"Inter", -apple-system, "Segoe UI", Roboto, Arial,
sans-serif`. Monospace: `ui-monospace, "SF Mono", "Cascadia Code",
Menlo, Consolas, monospace`.

| Token | Size | Line-height | Typical use |
|---|---|---|---|
| `text-xs` | 12px | 18px | metadata, timestamps, badges |
| `text-sm` | 14px | 20px | secondary body text, form labels, table cells |
| `text-md` | 16px | 24px | default body text, buttons, inputs |
| `text-lg` | 18px | 28px | emphasized body, card titles |
| `text-xl` | 20px | 30px | section headings (h3-level) |
| `text-display-xs` | 24px | 32px | h2-level headings |
| `text-display-sm` | 30px | 38px | h1-level headings |
| `text-display-md` | 36px | 44px, letter-spacing −0.72px | rare — a plugin's own splash/hero moment, if it has one |

Heading weight is always 600 (semibold), never 700 or 400 — this is
what distinguishes a heading from emphasized body text in this system.
Body text weight is 400; interactive text (buttons, controls styled as
links) is 600, matching the button spec in §B7.

Default heading rhythm inside a plugin's content view: h1
`text-display-sm`/600, margin-top 40px margin-bottom 20px; h2
`text-display-xs`/600, margin-top 32px margin-bottom 16px; h3
`text-xl`/600, margin-top 32px margin-bottom 12px; h4 `text-lg`/600,
margin-top 20px margin-bottom 8px. Reuse this rhythm instead of
inventing new heading spacing per plugin.

## B3. Color System

Two layers: a small **primitive scale** (raw hues) and a **semantic
layer** built on top of it. Always build UI against the semantic layer
— never reference a primitive directly in a component. This is what
keeps a future theme change (or a plugin's own light/dark toggle, which
*is* entirely the plugin's own business, unlike shell chrome — §A1)
from requiring a rewrite: the semantic layer remaps, the primitive
scale doesn't.

**Backgrounds**

| Token | Suggested value | Use |
|---|---|---|
| `--color-bg-primary` | `#ffffff` | page/canvas background, cards |
| `--color-bg-primary_hover` | `#fafafa` | hover state of a primary-bg element |
| `--color-bg-secondary` | `#f5f5f5` | subtle section background, an internal sidebar |
| `--color-bg-tertiary` | `#ececec` | recessed wells (code blocks, input backgrounds) |
| `--color-bg-brand-solid` | `#5b8cff` | solid brand fill (primary buttons) — matches shell's `--titir-accent` (§A1) if you want visual continuity with the nav column, though nothing requires it |
| `--color-bg-brand-solid_hover` | `#4270e0` | hover of the above |
| `--color-bg-error-primary` / `-solid` | `#fef2f2` / `#dc2626` | error surfaces, escalating strength |
| `--color-bg-success-primary` / `-solid` | `#f0fdf4` / `#16a34a` | success surfaces |
| `--color-bg-overlay` | `#0a0a0a` at ~65% opacity | modal/drawer backdrop |

**Text**

| Token | Suggested value | Use |
|---|---|---|
| `--color-text-primary` | `#171717` | headings, primary body copy |
| `--color-text-secondary` | `#404040` | secondary copy, form labels |
| `--color-text-tertiary` | `#737373` | metadata, captions |
| `--color-text-placeholder` | `#a3a3a3` | input placeholder text only |
| `--color-text-error-primary` | `#dc2626` | error messages |
| `--color-text-success-primary` | `#16a34a` | success messages |
| `--color-text-on-brand` | `#ffffff` | text placed on a solid brand-fill background |

**Borders / focus**

| Token | Suggested value | Use |
|---|---|---|
| `--color-border-primary` | `#d4d4d4` | default component border (inputs, cards) |
| `--color-border-secondary` | `#e5e5e5` | dividers, table row borders |
| `--color-border-brand` | `#5b8cff` | focused/selected input border |
| `--color-border-error` | `#ef4444` | invalid input border |
| `--color-focus-ring` | `#5b8cff` | keyboard focus ring (§B9) |
| `--color-focus-ring-error` | `#ef4444` | focus ring on an errored field |

A plugin choosing to support its own dark mode is entirely its own
implementation — remap this semantic layer under whatever toggle
mechanism your plugin's own state uses (there is no shell-pushed theme
event to hook, per §A1). Nothing about that is shared with, or checked
against, shell chrome.

## B4. Radius Scale

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 4px | tags, checkboxes, small chips |
| `radius-md` | 6px | inputs, buttons |
| `radius-lg` | 8px | cards, dropdown menus, tooltips |
| `radius-xl` | 12px | modals, larger media containers |
| `radius-2xl` | 16px | hero panels, large feature cards |
| `radius-full` | 9999px | pills/badges, icon-only circular buttons |

Don't mix an ad-hoc radius (7px, 10px) into interior UI — pick the
nearest token by component category, not by feel.

## B5. Shadows

| Token | Use |
|---|---|
| `shadow-xs` | subtle lift on buttons/inputs |
| `shadow-sm` | dropdown menus, popovers |
| `shadow-md` | cards that need to read as "raised" |
| `shadow-lg` | dialogs/modals |
| `shadow-xl` | large overlays, command-palette-style surfaces |

Don't stack more than one shadow token on the same element unless a
component spec below explicitly calls for it.

## B6. Breakpoints & Max Width

`breakpoint-xs: 600px`, then standard `sm/md/lg/xl` at
`640/768/1024/1280px`. Content max width: `1280px` — center wide
content beyond this rather than letting it stretch edge-to-edge on
large displays. Because a plugin's view fills the entire content area
with no fixed width of its own (§A2 — the content area is `winWidth -
72`), design interior layouts responsively down to at least 600px wide,
since the content area can be as narrow as a small window minus 72px.

## B7. Buttons — Suggested Specs

Five sizes, four semantic variants (primary, secondary, tertiary,
link), each with a destructive counterpart that swaps brand→error
tokens 1:1. Weight is always 600; text size and padding scale together:

| Size | Padding | Text | Radius |
|---|---|---|---|
| `xs` | 10px h / 6px v | `text-sm` | `radius-lg` |
| `sm` | 12px h / 8px v | `text-sm` | `radius-lg` |
| `md` | 14px h / 10px v | `text-sm` | `radius-lg` |
| `lg` | 16px h / 10px v | `text-md` | `radius-lg` |
| `xl` | 18px h / 12px v | `text-md` | `radius-lg` |

Icon-only buttons: square hit target matching vertical padding — 8px
at `xs/sm`, 10px at `md`, 12px at `lg`, 14px at `xl`.

**Variants:**
- **Primary** — `--color-bg-brand-solid` fill, white text, `shadow-xs`,
  hover → `--color-bg-brand-solid_hover`. One primary action per
  view/section — never two competing in the same context.
- **Secondary** — `--color-bg-primary` fill, `--color-text-secondary`
  text, 1px `--color-border-primary` ring, same shadow, hover →
  `--color-bg-primary_hover`.
- **Tertiary** — no fill, no ring, `--color-text-tertiary`, hover →
  `--color-bg-primary_hover` fill. Use for the least-important action
  in a group.
- **Link** — no padding, no background, colored text with an underline
  offset scaling with size (3px at sm/md, 4px at lg/xl).

**States (every button, every variant):** default, hover (above),
focus-visible (§B9), active/pressed (one step darker than hover),
loading (icon replaced by a spinner, non-interactive, background stays
at hover-state color), disabled (40% opacity, `cursor: not-allowed`,
no hover/focus styling).

## B8. Inputs — Suggested Specs

Height matches button height at the same size step. Padding: `text-sm`
inputs get 12px horizontal / 8px vertical at `sm`, 14px/10px at `md`.
Background `--color-bg-primary`, 1px `--color-border-primary` ring,
`radius-lg`, `shadow-xs`. Placeholder text: `--color-text-placeholder`.

States:
- Hover: ring unchanged, `shadow-xs` if not already present.
- Focus: ring → `--color-border-brand`, plus the 2px `--color-focus-
  ring` outline pattern from §B9.
- Error: ring → `--color-border-error`, focus ring → `--color-focus-
  ring-error`, a `text-sm` helper message below in `--color-text-
  error-primary`, 4px gap.
- Disabled: `--color-bg-secondary` fill, `--color-text-placeholder`
  text, `cursor: not-allowed`.

Label above every input: `text-sm`/600, `--color-text-secondary`, 6px
gap to the input. Helper/error text below: `text-sm`/400, 6px gap from
the input.

## B9. Focus & Accessibility — Strongly Recommended

Nothing in this section is enforced by the shell — same status as the
rest of Part B — but it's the one part of Part B worth treating as a
near-hard rule for your own plugin's sake:

- Every interactive element gets a visible `focus-visible` state: 2px
  solid outline in `--color-focus-ring` (or the `-error` variant), 2px
  outline-offset. Never `outline: none` without substituting an
  equivalent focus indicator.
- Minimum hit target 40×40px for any icon-only control — even if the
  visual glyph is smaller, pad the clickable area out to 40px.
- Body text (`--color-text-secondary` or darker) on
  `--color-bg-primary`/`-secondary` should clear a 4.5:1 contrast
  ratio.
- Never convey state (error, success, disabled) by color alone — pair
  it with an icon, label text, or both.
- Respect `prefers-reduced-motion`: anywhere §B10 specifies a
  transition, cut it to near-zero duration under that media query
  rather than removing the state change entirely.

## B10. Motion (Interior UI)

Standard transition: `150ms ease` for hover/focus color and background
changes (background, border, text-color, box-shadow only — never
transition `width`/`height`/`top`/`left`, which causes layout thrash;
use `transform`/`opacity` for anything that needs to move or fade).
Modals/drawers: 200ms enter, 150ms exit, `ease-out` on enter / `ease-in`
on exit, combined with a scale (0.96→1) + opacity fade for modals, a
translate + opacity fade for drawers/toasts. Don't exceed 300ms for any
interior transition — motion here should read as instant feedback, not
a performance.

## B11. Implementation Notes

TiTir ships no plugin-facing component library — Technical
Specification §2 keeps that explicitly out of scope, so there is
nothing here analogous to an importable button/input/modal package.
Treat §B7–B10 as the spec to reproduce by hand (or via whichever
framework your own build step already uses — React, Vue, plain DOM,
anything, per Plugin Guide §9/§16). If a component type isn't covered
above (a table, a date picker, a chart), compose it from the §B1–B6
primitives rather than reaching for visual choices outside this system
— that's how drift from the rest of TiTir's plugins creeps in.

## B12. Layout Inside a Plugin's View

- Outer padding for a top-level content view: 24px below 600px width,
  32px from 600–1024px, 40px above 1024px.
- Section spacing (gap between major content blocks): 32px.
- Card/list-item internal padding: 16px (compact) or 24px
  (comfortable) — pick one per surface and hold it consistently; don't
  mix densities in the same list.
- Grid gutters: 16px at `sm`, 24px at `md` and above.
- Sticky/fixed headers inside a plugin (if any): height 56–64px,
  `--color-bg-primary`, bottom `--color-border-secondary` hairline,
  a shadow only once content has scrolled under it, not at rest.

---

## Appendix — Decision Checklist

- Building shell chrome? → Part A, values are fixed, don't touch.
- Building plugin interior UI? → Part B is the default; only deviate
  with a stated reason.
- Picking a color? → Never a raw hex value pasted inline — always the
  semantic token, matched by *role* (primary/secondary/tertiary
  text or background), not by eyeballing the resulting color.
- Picking a spacing value? → Nearest 4px step (§B1). No exceptions.
- Picking a radius? → §B4's table by component category, not by feel.
- Adding an interactive element? → It needs default, hover,
  focus-visible (§B9), and disabled states before it ships. Loading
  and error states too, if the action can be slow or can fail.
- Something looks "unfinished"? → It's missing one of the states
  above, or using a value not in this document — fix by finding the
  correct token here, not by approximating.
- Unsure whether something belongs in Part A or Part B? → If it's
  drawn inside the 72px nav column, the idle state, or the crash
  toast, it's Part A and MANDATORY. Everything inside a plugin's own
  `WebContentsView` is Part B and RECOMMENDED, never enforced.

---

*Visual Design Guide maintained for TiTir, shared by the Plugin Guide
and the Technical Specification. PuFi has opinions about none of this
and offers no warranty, implied or otherwise.*
