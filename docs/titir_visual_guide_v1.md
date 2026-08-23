# TiTir — Visual Guide

**Project:** TiTir · **Author:** Bijoy · **Mascot:** PuFi · **Doc version:** v1

---

## 0. What This Document Is

This is the single shared source of visual/design tokens for TiTir —
color, type, spacing, icon sizing, and PuFi's mascot rules. It exists
so that two things that are built and read independently of each other
don't drift into two different color palettes by accident:

- **The shell's own chrome** — the navigation column, the window
  controls row, and the idle/empty state — which is built once, by
  TiTir itself, and should look consistent across all of it.
- **Any plugin author** who wants their icon, and optionally their
  plugin's own interior, to look like it belongs in TiTir rather than
  clash with it.

**Nothing in this document is enforced by the shell.** The technical
specification's §2 (Non-Goals) explicitly keeps any visual design
system out of scope for v1, and the plugin guide's §15 confirms a
plugin's internal look is entirely FREE. This file is a convention, not
a validator — nothing here can cause an install to be refused or a
plugin to fail to mount. Skip all of it and your plugin is exactly as
legal as one that follows it to the letter.

This document does **not** duplicate anything structural. Bounds math,
`NAV_WIDTH`, `TITLEBAR_HEIGHT`, and the mount/handshake sequence live in
the technical specification and the plugin guide — this file only
describes how things *look* inside the structure those documents
already define.

---

## 1. Color Tokens

A small set of semantic tokens, not raw hex values pasted everywhere.
Define these once (a CSS custom-property block, a TS `const` object —
whichever your renderer already uses) and reference the token name, not
the value, throughout.

| Token | Role | Example value |
|---|---|---|
| `--titir-bg` | Window/base background, behind everything | `#15161a` |
| `--titir-surface` | Navigation column background, card backgrounds | `#1c1e24` |
| `--titir-surface-raised` | Hover/active state background (plugin icon hover, button hover) | `#262931` |
| `--titir-border` | Hairline dividers — between the window-controls row and the plugin list, around cards | `#2e313a` |
| `--titir-text-primary` | Primary text and active-icon glyphs | `#eceef2` |
| `--titir-text-secondary` | Tooltips, secondary labels, the Hub's summary text | `#9a9fac` |
| `--titir-accent` | The active plugin's icon indicator, focus rings, primary buttons | `#5b8cff` |
| `--titir-danger` | Uninstall confirmations, crash toasts, destructive actions | `#e2564f` |

These are a dark palette because a persistent, always-visible
navigation column reads best low-contrast against typical desktop
wallpaper — but nothing about the shell's structure requires dark mode
specifically. If a future revision adds a light theme, it swaps the
values above, not the token names, so nothing consuming
`var(--titir-accent)` needs to change.

**For plugin authors:** using these tokens inside your own `entry` page
is entirely optional. If you do, prefer reading them as CSS custom
properties rather than hardcoding the hex values above, since a future
theme revision only needs to change the token definitions, not every
consumer.

---

## 2. Typography

| Context | Font stack | Size | Weight |
|---|---|---|---|
| Navigation column tooltip (`name`) | System UI stack: `-apple-system, "Segoe UI", Roboto, sans-serif` | `13px` | `500` |
| Hub plugin list — plugin name | Same system stack | `14px` | `600` |
| Hub plugin list — `summary` | Same system stack | `13px` | `400`, `--titir-text-secondary` |
| Idle/empty state — "TiTir" wordmark | Same system stack | `20px` | `600` |
| Idle/empty state — tagline under the wordmark | Same system stack | `13px` | `400`, `--titir-text-secondary` |

No custom webfont is bundled with the shell — the system UI stack keeps
the shell's own renderer lightweight and matches native OS chrome, which
matters more here than brand distinctiveness since the navigation
column is small and mostly icon-driven. Plugin authors are entirely
FREE to bundle their own fonts inside their own view; this table only
describes the shell's own chrome.

---

## 3. Spacing & Layout Constants

These two are load-bearing for the main-process bounds math and are
defined authoritatively in the technical specification, not here —
repeated only for convenience so this is a complete visual reference in
one place:

| Constant | Value | Defined in |
|---|---|---|
| `NAV_WIDTH` | `72px` | Technical Specification §10 |
| `TITLEBAR_HEIGHT` | `40px` | Technical Specification §10, §13 |

Everything below is presentation-only and carries no structural weight
— changing these values doesn't touch any bounds math:

| Token | Value | Used for |
|---|---|---|
| `--titir-space-xs` | `4px` | Icon-to-tooltip gap, tight internal padding |
| `--titir-space-sm` | `8px` | Padding inside a nav icon's hit area |
| `--titir-space-md` | `16px` | Padding inside Hub list rows, idle-state internal spacing |
| `--titir-space-lg` | `24px` | Margin around the idle-state wordmark/mascot group |
| `--titir-radius` | `8px` | Corner radius for hover states, Hub list rows, toasts |
| `--titir-radius-icon` | `10px` | Corner radius for the square hit-area behind each nav icon |

---

## 4. Navigation Icons

This expands on the plugin guide's §15/§22 icon rules with the actual
sizing math behind "must read clearly at the small size the navigation
column renders icons at":

- **Rendered icon size:** `28px × 28px`, centered inside a `44px ×
  44px` hit area (so touch/click targets stay comfortable even though
  `NAV_WIDTH` is only `72px`).
- **Safe area:** keep the meaningful part of an SVG icon inside a
  `24px × 24px` box centered in the `28px` render size — a couple of
  pixels of breathing room prevents glyphs from visually touching the
  rounded hit-area edge.
- **Color:** monochrome, using `currentColor`, so the same glyph
  automatically renders in `--titir-text-secondary` at rest and
  `--titir-text-primary` (or `--titir-accent`, for the active plugin)
  without the icon author doing anything — this is *why* the plugin
  guide requires `currentColor` rather than a baked-in fill color.
- **Active-plugin indicator:** a `2px` left-edge bar in `--titir-accent`
  alongside the active icon, not a background fill change — this keeps
  icon legibility identical whether a plugin is active or not.
- **Fallback glyph:** plugins that omit `icon` in their manifest get a
  generic outline-square glyph at the same `28px` size, in
  `--titir-text-secondary` — visually consistent with, but intentionally
  less distinct than, an authored icon, since the whole point of an
  authored icon is to stand out from this fallback.

---

## 5. PuFi — Mascot Usage

PuFi appears in exactly one place the shell itself draws: the idle/
empty content-area state shown before any plugin has ever been clicked
(technical specification §10).

- **Placement:** centered in the content area, mascot mark above the
  "TiTir" wordmark, tagline below — the `--titir-space-lg` token governs
  the vertical rhythm between the three.
- **Color:** PuFi's mark is monochrome in `--titir-text-secondary` in
  this context, matching the tagline rather than competing with it —
  the idle state is meant to be calm, not a splash screen.
- **Clear space:** keep at least one mascot-height of empty space around
  the mark on all sides before any other element (this matters most on
  small windows, where the idle state is the only content-area occupant
  anyway, so there's rarely contention).
- **Where PuFi does *not* appear:** inside any plugin's own view (that
  space belongs entirely to the plugin author, per the plugin guide's
  §15), in the Hub's plugin-management UI, in crash toasts, or anywhere
  else in shell chrome. One appearance, one place — this keeps it a
  quiet signature rather than a repeated mascot element competing with
  plugin content.
- **For plugin authors:** PuFi is TiTir's own mascot mark for TiTir's
  own idle state. Using it inside your own plugin's UI is off the table
  regardless of the FREE/RECOMMENDED/MANDATORY framing this document
  otherwise uses — it would misrepresent your plugin's content as part
  of the shell itself.

---

## 6. Motion

- **View switching has no transition.** When the active plugin changes,
  the outgoing view's bounds go to `{0,0,0,0}` and the incoming view's
  bounds go to full content-area size in the same tick (technical
  specification §8, §10) — there is deliberately no cross-fade or slide,
  because animating between two entirely separate `WebContentsView`
  processes is unreliable and the perceived cost of an instant switch is
  lower than the complexity of faking a smooth one across process
  boundaries.
- **Everything else is ordinary UI motion**, kept short and confined to
  the shell's own chrome: hover/press state changes on nav icons and
  Hub list rows use a `120ms` ease-out opacity/background transition;
  toasts (crash relaunch prompts) slide in over `160ms` and dismiss over
  `120ms`. Nothing here is enforced or shared with plugin content — a
  plugin author's own view can use any motion approach they like.

---

## 7. Where This Applies

| Surface | Governed by this document? |
|---|---|
| Navigation column (icons, window controls row, Hub slot) | Yes — this is the shell's own chrome |
| Idle/empty content-area state | Yes |
| A plugin's `icon` manifest field | Optionally — §4 above, RECOMMENDED not MANDATORY |
| A plugin's own `entry` page interior | Optionally, entirely the author's call — nothing here is read or checked by the shell |
| Hub's plugin-management UI | Yes — the Hub is TiTir's own built-in plugin (plugin guide §1, technical specification §6), and its interior follows this guide even though structurally it's "just a plugin" like any other |

---

*Visual Guide maintained for TiTir, shared by the Plugin Guide and the
Technical Specification. PuFi has opinions about none of this and
offers no warranty, implied or otherwise.*
