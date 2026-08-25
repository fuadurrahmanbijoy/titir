# Fluent 2 Design Guide — Building a Teams-Style Interface

**Version:** 1.0
**System:** Microsoft Fluent 2
**Target look:** Microsoft Teams (desktop/web client)
**Scope:** Color, typography, iconography, spacing, corner radius, elevation, materials, motion, and Teams-specific layout patterns.

This document is written so a follower never has to guess. Every
token below has an exact value — a hex code, a pixel number, a
cubic-bezier curve, a millisecond duration. Where Fluent gives you a
choice (which shadow, which icon style, which spacing step), this
guide states the rule for making that choice, not just the menu of
options. If something isn't covered here, don't invent a value —
round to the nearest documented token by role, the same way the
system itself is built.

---

## 0. How to Use This Document

1. **Never hardcode a raw hex code, pixel value, or cubic-bezier
   curve in application code.** Every value in this guide exists as a
   named design token (`@fluentui/react-components` on web, or the
   equivalent token package on other platforms). Reference the token,
   not the value behind it — that's what makes dark mode, high
   contrast, and future theme updates work without touching component
   code.
2. Section order follows the order you'll actually need it in: read
   §1–§2 once for the mental model, then use §3–§10 as a lookup
   reference while building, and §11–§15 when you need the
   Teams-specific application of the system.
3. Every table in this guide is the literal contract — the column
   values are what ships in `@fluentui/react-components` v9 (Fluent
   2's web implementation), which is also what Teams' web and desktop
   clients are built on. There is no "close enough" value.

---

## 1. Design Philosophy & the Five Foundations

Fluent 2 is Microsoft's cross-platform design system — the same
language behind Teams, Outlook, Word, Excel, and Windows 11 itself.
It's grounded in four stated values and five foundational elements.
Internalize these before touching a single token; they explain *why*
the rules in later sections exist, not just what they are.

### 1.1 The Four Values

| Value | What it means in practice |
|---|---|
| **Accessible** | WCAG AA minimum: 4.5:1 contrast for body text, 3:1 for large text and UI components. Every interactive element is keyboard-navigable and screen-reader friendly. This is not a checklist pass at the end — it's why the color and focus-ring tokens are shaped the way they are (§3, §13). |
| **Coherent** | One visual language, the same tokens, regardless of surface. A button in Teams and a button in Outlook use the same `colorBrandBackground`, the same `borderRadiusMedium`, the same `durationFast` — this is what makes the whole Microsoft 365 suite feel like one product family. |
| **Delightful** | Purposeful motion, depth through elevation, smooth transitions (§8, §10) — but always in service of communicating state, never decoration for its own sake. |
| **Adaptive** | Works across light mode, dark mode, high-contrast themes, and varying screen densities without component-level rewrites, because everything routes through the token layer (§2). |

### 1.2 The Five Foundational Elements

| Element | Covers |
|---|---|
| **Light** | How color and brightness establish hierarchy and focus — the neutral and brand color ramps (§3). |
| **Depth** | Elevation and shadow used to communicate layering — what floats above what (§8). |
| **Motion** | Purposeful animation that orients the person during state changes (§10). |
| **Material** | Acrylic and Mica — translucent, blurred surfaces used sparingly for specific structural regions (§9). |
| **Scale** | Responsive layout and typography that adapts to window size and screen density (§4, §6). |

---

## 2. The Token Architecture — Three Tiers

Every styling decision in Fluent 2 flows through three tiers. Get
this hierarchy wrong and nothing else in this document will click.

```
Global tokens  →  Alias tokens  →  Component tokens
(raw values)      (semantic roles)   (per-component overrides)
```

| Tier | What it is | Example |
|---|---|---|
| **Global tokens** | Context-agnostic raw values — hex codes, raw pixel sizes, raw font weights. No semantic meaning of their own. | `grey[94]` = `#F0F0F0`, `brand[80]` = `#0F6CBD` |
| **Alias tokens** | Global tokens given semantic meaning and role. This is the layer you actually build against. Color alias tokens carry light/dark/high-contrast variants automatically. | `colorNeutralBackground1`, `colorBrandForeground1`, `colorNeutralStroke1` |
| **Component tokens** | Component-specific values built on top of alias tokens, for the rare case a specific control needs a variance from the general alias (e.g. a button's specific padding). | Internal to each component's implementation |

**The rule:** build UI exclusively against alias tokens (and
component tokens where a component library provides them). Never
reference a global token directly in application code, and never
paste a raw hex value or pixel number where a token exists for that
role. This is the single rule that makes theming, dark mode, and
accessibility remapping possible without touching a component again.

---

## 3. Color System

Fluent defines three color palettes — **neutral**, **brand**, and
**shared/status** — plus an extended **palette** of 30+ hue families
for data visualization, avatars, and tags. Every color alias token
below ships with a light-mode and dark-mode value; the token name
never changes between themes, only what it resolves to.

### 3.1 Neutral Palette — Backgrounds

These are the workhorse surfaces of any Fluent interface, and the
ones you'll reach for constantly building a Teams-style layout.

| Alias token | Light | Dark | Use for |
|---|---|---|---|
| `colorNeutralBackground1` | `#FFFFFF` | `#292929` | The primary content surface — a message pane, a card's base. |
| `colorNeutralBackground2` | `#FAFAFA` | `#1F1F1F` | A layered surface just beneath background 1 — panels, secondary regions. |
| `colorNeutralBackground3` | `#F5F5F5` | `#141414` | Subtle layered surface — the app's outermost canvas. |
| `colorNeutralBackground4` | `#F0F0F0` | `#0A0A0A` | Deepest neutral layer — rarely used directly. |
| `colorNeutralBackgroundInverted` | `#292929` | `#FFFFFF` | Content that must stay legible when placed over the opposite theme (a tooltip, a dark overlay in light mode). |
| `colorNeutralBackgroundStatic` | `#333333` | `#383838` | A background that intentionally does **not** flip between light/dark — used for a few fixed-dark elements like the Teams navigation rail. |
| `colorSubtleBackground` | transparent → `#F5F5F5` on hover | transparent → `#3D3D3D` on hover | Ghost/subtle buttons, list-row hover — invisible at rest, appears only on interaction. |

**Interaction states.** Every interactive background token
(`colorNeutralBackground1`, `colorSubtleBackground`, etc.) carries
four states: **Rest → Hover → Pressed → Selected**, each a
progressively different value. Never hand-roll a hover color by
darkening/lightening a rest color yourself — use the token's own
Hover variant, since it's calibrated for contrast, not just visually
"a bit darker."

### 3.2 Neutral Palette — Foreground (Text & Icons)

| Alias token | Light | Dark | Use for |
|---|---|---|---|
| `colorNeutralForeground1` | `#242424` | `#FFFFFF` | Primary text and icons — headings, body copy, active nav icons. |
| `colorNeutralForeground2` | `#424242` | `#D6D6D6` | Secondary text — metadata, timestamps, less prominent labels. |
| `colorNeutralForeground3` | `#616161` | `#ADADAD` | Tertiary text — placeholder-adjacent, disabled-adjacent copy. |
| `colorNeutralForeground4` | `#707070` | `#999999` | The lightest still-legible neutral — rarely body text, mostly decorative labels. |
| `colorNeutralForegroundDisabled` | `#BDBDBD` | `#5C5C5C` | Disabled text and icons. |
| `colorNeutralForegroundOnBrand` | `#FFFFFF` | `#FFFFFF` | Text/icons placed on a solid brand-color fill (e.g. text inside a primary button). |

**Contrast rule (§1.1):** body text on `colorNeutralBackground1`/`2`
must clear 4.5:1. `colorNeutralForeground1` and `colorNeutralForeground2`
are pre-calibrated to clear this against their matching backgrounds —
`colorNeutralForeground3` and lighter are for large text or
non-text UI only, never small body copy.

### 3.3 Neutral Palette — Stroke (Borders & Dividers)

| Alias token | Light | Dark | Use for |
|---|---|---|---|
| `colorNeutralStroke1` | `#D1D1D1` | `#666666` | Default component border — inputs, cards, dividers between major regions. |
| `colorNeutralStroke2` | `#E0E0E0` | `#444444` | Lighter divider — subtle separation within a single region (e.g. list-row hairlines). |
| `colorNeutralStrokeAccessible` | `#616161` | `#ADADAD` | A stroke that itself must clear 3:1 contrast — used on interactive-element outlines that convey meaning, not just decoration. |

### 3.4 Brand Palette

Teams' signature blue. This is the one color that carries the
product's identity through every surface.

| Alias token | Light | Dark | Use for |
|---|---|---|---|
| `colorBrandBackground` | `#0F6CBD` (Rest) → `#115EA3` (Hover) → `#0F548C` (Pressed) | `#0F6CBD` → variant | Primary button fill, the active-tab underline, primary CTAs. |
| `colorBrandForeground1` | `#0F6CBD` | `#4F52B2`-family tint | Links, brand-colored icons, the "you are here" indicator. |
| `colorBrandForeground2` | `#115EA3` | lighter tint | Hover state of brand-colored text/links. |
| `colorBrandStroke1` | `#0F6CBD` | tint | Focus/selected borders on brand-adjacent components. |
| `colorCompoundBrandBackground` | `#0F6CBD` → `#115EA3` (Hover) → `#0F548C` (Pressed) | same pattern | The specific token used by Fluent's "compound" button/badge components that need brand color plus built-in interaction states. |

**The exact brand blue, memorized:** `#0F6CBD`. If you're
reproducing Teams' look and only remember one hex value, this is it —
it's the fill on every primary button, the active nav-rail indicator,
and the accent used across the whole suite.

### 3.5 Status / Semantic Colors

| Meaning | Alias token (background/fill) | Hex (Light) | Foreground pairing |
|---|---|---|---|
| **Danger / Error** | `colorStatusDangerBackground3` | `#C50F1F` | `colorStatusDangerForeground1` (`#B10E1C`-family) — error text, destructive-button fills, mention badges for failures. |
| **Success** | `colorStatusSuccessBackground3` | `#107C10` | `colorStatusSuccessForeground1` — online-presence dots, success toasts, "sent" checkmarks. |
| **Warning** | `colorStatusWarningBackground3` | `#F7630C` | `colorStatusWarningForeground1` — away/be-right-back presence, non-blocking warning banners. |

Each status color also ships lighter `...Background1`/`...Background2`
tint steps for subtle banner/badge backgrounds (a pale red toast
background, not the full-saturation red), and a matching `...Border1`
stroke step. Never construct a tinted status color by applying opacity
to the primary hex yourself — use the token's own tint step, since
it's calibrated per theme (light vs. dark tints aren't simple opacity
math).

### 3.6 Extended Palette (Presence, Tags, Avatars)

Beyond brand/neutral/status, Fluent ships 30+ named hue families
(`colorPaletteRed`, `colorPaletteBerry`, `colorPaletteMarigold`,
`colorPaletteForest`, `colorPaletteRoyalBlue`, and more), each with
Background1/2/3 and Foreground1/2 steps identical in structure to
§3.5's status colors. This is the palette Teams draws from for:

- **Avatar background colors** — a person's avatar gets a
  deterministic color from this palette (hashed from their name/ID),
  so the same person always gets the same color across the app.
- **Tags and labels** — channel tags, category chips.
- **Data visualization** — charts, presence-adjacent indicators
  beyond the three core statuses.

Never invent a new hue for these use cases — pick from this extended
palette so a new tag or avatar color stays inside the system's
overall color harmony instead of introducing an off-system hue.

### 3.7 Color Application Map — Reproducing Teams Specifically

| Teams surface | Token(s) to use |
|---|---|
| Navigation rail (leftmost icon strip) | `colorNeutralBackgroundStatic` (fixed dark regardless of app theme) with icons in a light-on-dark neutral foreground; active item gets a `colorBrandBackground`-colored left-edge indicator bar |
| Top title/command bar | `colorNeutralBackground1` (or Acrylic — see §9) with a `colorNeutralStroke2` hairline beneath it |
| Chat list / left content pane | `colorNeutralBackground1`, rows separated by `colorNeutralStroke2` hairlines, row hover uses `colorSubtleBackground`'s Hover step |
| Message/content pane | `colorNeutralBackground1` |
| Compose box | `colorNeutralBackground1` with a `colorNeutralStroke1` border, elevated with `shadow4` (§8) when focused |
| Primary action buttons (Send, Join) | `colorBrandBackground` fill, `colorNeutralForegroundOnBrand` text |
| Presence dot — available | `colorStatusSuccessBackground3` (`#107C10`) |
| Presence dot — away/BRB | `colorStatusWarningBackground3` (`#F7630C`) |
| Presence dot — busy/DND | `colorStatusDangerBackground3` (`#C50F1F`) |
| Unread message badge | `colorBrandBackground` fill, white numeral |
| Mention badge | `colorStatusDangerBackground3` fill |

---

## 4. Typography

### 4.1 Typeface

| Platform | Typeface | Notes |
|---|---|---|
| Web | **Segoe UI** | Fluent's web type ramp defaults here; falls back to native system fonts (`-apple-system`, `Roboto`, etc.) if Segoe UI isn't installed. |
| Windows | **Segoe UI Variable** | A variable font with a weight axis (100–900) and an automatic optical-size axis (8pt–36pt) that adjusts letterform detail for legibility at small sizes and personality at large ones. |
| macOS / iOS | **San Francisco Pro** | Apple's native system font, styled to Fluent's type ramp proportions. |
| Android | Native Android type family (Roboto-based) | Styled to the same ramp. |
| Monospace (all platforms) | **Cascadia Code** (falls back to Consolas) | Code blocks, technical content. |

**Rule:** never introduce a custom typeface into a Fluent 2 surface.
Stick to the base font (`fontFamilyBase` token) for all UI text; use
the monospace token only for code.

### 4.2 The Type Ramp — Exact Values

Every value below is exact: font size, line height, and default
weight. This is the literal `typographyStyles` table Fluent UI React
v9 ships.

| Preset | Font size | Line height | Weight | Typical use |
|---|---|---|---|---|
| `Caption2` | 10px | 14px | Regular (400) | Smallest metadata — timestamps buried in dense lists. |
| `Caption2Strong` | 10px | 14px | Semibold (600) | Same, emphasized. |
| `Caption1` | 12px | 16px | Regular (400) | Standard metadata, helper text, badge labels. |
| `Caption1Strong` | 12px | 16px | Semibold (600) | Emphasized captions. |
| `Caption1Stronger` | 12px | 16px | Bold (700) | Strongest caption emphasis. |
| `Body1` | 14px | 20px | Regular (400) | **The default body text size across Fluent 2.** Message content, form labels, most UI text. |
| `Body1Strong` | 14px | 20px | Semibold (600) | Emphasized body text — a sender's name in a message row. |
| `Body1Stronger` | 14px | 20px | Bold (700) | Strongest body emphasis. |
| `Body2` | 16px | 22px | Regular (400) | Slightly larger body text — comfortable reading contexts, some form inputs. |
| `Subtitle2` | 16px | 22px | Semibold (600) | Card titles, small section headers. |
| `Subtitle2Stronger` | 16px | 22px | Bold (700) | Stronger subtitle emphasis. |
| `Subtitle1` | 20px | 26px | Semibold (600) | Panel headers, dialog titles. |
| `Title3` | 24px | 32px | Semibold (600) | Section headings within a page. |
| `Title2` | 28px | 36px | Semibold (600) | Page-level headings. |
| `Title1` | 32px | 40px | Semibold (600) | Major page titles. |
| `LargeTitle` | 40px | 52px | Semibold (600) | Hero headings, empty-state titles. |
| `Display` | 68px | 92px | Semibold (600) | Marketing/splash-level display text — rare inside product UI itself. |

**Heading weight rule:** every heading-level preset (`Subtitle1` and
above) defaults to Semibold (600), never Bold (700) and never Regular
(400) — this is what makes a Fluent heading read as a heading rather
than emphasized body text sitting at a bigger size. Reserve Bold (700)
for the `...Stronger` body/caption variants specifically.

### 4.3 Hierarchy Rules for a Teams-Style Interface

- **Message text:** `Body1` (14px/20px, regular).
- **Sender name above a message:** `Body1Strong` (14px/20px, semibold)
  in `colorNeutralForeground1`.
- **Timestamp next to a sender name:** `Caption1` (12px/16px, regular)
  in `colorNeutralForeground3`.
- **Channel/chat name in the list pane:** `Body1Strong`.
- **Panel/dialog titles:** `Subtitle1` (20px/26px, semibold).
- **Section headers inside settings or a panel:** `Subtitle2`
  (16px/22px, semibold).
- Never skip more than one step down the ramp between adjacent
  hierarchy levels in the same view (e.g. don't jump straight from
  `Title1` to `Caption1` with nothing between) — it reads as broken
  hierarchy, not intentional contrast.

---

## 5. Iconography

### 5.1 Source — Fluent UI System Icons

The **only** correct icon source for a Fluent 2 / Teams-style
interface is **Fluent UI System Icons**, Microsoft's official open
(MIT-licensed) icon library:

- **Package (web/React):** `@fluentui/react-icons` on npm — tree-shakeable, one React component per icon/size/style combination.
- **Raw assets:** `@fluentui/svg-icons` — plain optimized SVG files, framework-agnostic.
- **Repository:** `microsoft/fluentui-system-icons` on GitHub — the canonical source; ships a new release roughly every two weeks.
- **Windows-native equivalent:** the **Segoe Fluent Icons** font, used by WinUI controls — conceptually the same icon language, delivered as a glyph font instead of SVG components.

Never source icons from a different family (Material Symbols,
Font Awesome, Lucide, Feather, etc.) inside a Fluent 2 surface, even
if a specific glyph looks similar — Fluent icons are drawn on a
distinct grid with a distinct stroke weight and corner treatment, and
mixing families is immediately visible as inconsistency, especially
at small sizes.

### 5.2 Sizes and Naming Convention

Icons ship pre-drawn (not just scaled) at seven fixed pixel grids:
**12, 16, 20, 24, 28, 32, 48**. Each icon is drawn fresh for its
target size rather than resized from one master, which is why small
Fluent icons stay legible instead of turning to mush the way a
scaled-down 48px icon would.

Component naming follows `[Name][Size][Style]`, e.g.:

```
Mail24Regular
Mail24Filled
Search20Regular
ChevronDown16Regular
```

| Size (px) | Typical context |
|---|---|
| 12 | Inline badge glyphs, extremely dense metadata rows |
| 16 | Inline with `Caption1`/`Body1` text, dense toolbars, list-row inline icons |
| 20 | Standard toolbar and command-bar icons, the most common in-app icon size |
| 24 | Navigation rail icons, primary command buttons |
| 28 | Larger touch-oriented targets, prominent single actions |
| 32 | Empty-state or onboarding illustration-adjacent icons |
| 48 | Large empty-state icons, splash/illustration contexts |

**Teams-specific default:** the left navigation rail (Activity, Chat,
Teams, Calendar, Calls, Files) uses **24px** icons. Toolbar and
command-bar icons throughout the rest of the app use **20px**. Inline
icons sitting next to body/caption text use **16px**. Don't deviate
from this mapping — the whole point of a fixed size grid is that
every icon at the same size reads as visually consistent weight.

### 5.3 Regular vs. Filled — the State Rule

Every common icon ships in two styles: **Regular** (outlined,
lighter visual weight) and **Filled** (solid, heavier visual weight).
A smaller subset also ships **Light** and **Color** variants for
specific illustrative contexts.

**The rule that defines Teams' nav rail interaction, specifically:**

- **Rest / inactive state → Regular.**
- **Active / selected state → Filled**, paired with the
  `colorBrandForeground1` color and the brand-colored left-edge
  indicator bar (§3.7).

This Regular→Filled swap on selection is one of the most immediately
recognizable Fluent/Teams interaction patterns — a nav rail icon
"solidifying" when you land on that section. Reproduce it exactly:
never use Filled for a resting/inactive icon, and never leave an
active icon in Regular style.

Outside of this specific selected-state pattern, default to
**Regular** everywhere — toolbars, inline icons, buttons. Reserve
Filled for: the active-state swap above, and a small set of
icons where Filled is the semantically "on" state (a filled
pin for "pinned," a filled bell-slash for "notifications muted").

### 5.4 Icon Color

Icons never carry a hardcoded color. They inherit
`currentColor`/the surrounding text-color token by default:

- Inactive nav/toolbar icon → `colorNeutralForeground2`.
- Active/selected icon → `colorBrandForeground1`.
- Icon inside a filled brand button → `colorNeutralForegroundOnBrand`.
- Destructive-action icon (e.g. a trash icon) → `colorStatusDangerForeground1`.

---

## 6. Spacing & Layout

### 6.1 The Spacing Scale

Fluent 2 uses a **4px base grid**. Every spacing value in the system
is a token drawn from this scale — never an arbitrary pixel value.

| Token | Value |
|---|---|
| `spacingHorizontalXXS` / `spacingVerticalXXS` | 2px |
| `spacingHorizontalXS` / `spacingVerticalXS` | 4px |
| `spacingHorizontalSNudge` / `spacingVerticalSNudge` | 6px |
| `spacingHorizontalS` / `spacingVerticalS` | 8px |
| `spacingHorizontalMNudge` / `spacingVerticalMNudge` | 10px |
| `spacingHorizontalM` / `spacingVerticalM` | 12px |
| `spacingHorizontalL` / `spacingVerticalL` | 16px |
| `spacingHorizontalXL` / `spacingVerticalXL` | 20px |
| `spacingHorizontalXXL` / `spacingVerticalXXL` | 24px |
| `spacingHorizontalXXXL` / `spacingVerticalXXXL` | 32px |

**Default component padding reference:** a standard Fluent button
uses `spacingVerticalS`/`spacingHorizontalM` (8px vertical, 12px
horizontal) internal padding at its default size. A card or panel's
outer padding typically sits at `spacingHorizontalL`/`XL` (16–20px).
Never eyeball a padding value — round to the nearest step above.

### 6.2 Teams-Specific Layout Anatomy

A Teams-style window is a fixed multi-pane layout, not a fluid
single-column page. Reproduce this structural skeleton:

```
┌────┬───────────────────────┬──────────────────────────────┐
│    │                       │                                │
│Nav │  List pane             │  Content pane                  │
│rail│  (chats/channels/      │  (active conversation,         │
│    │   teams list)          │   file, or app view)           │
│    │                       │                                │
└────┴───────────────────────┴──────────────────────────────┘
```

| Region | Approx. width | Notes |
|---|---|---|
| Navigation rail | ~48–68px, fixed | Vertically stacked 24px icons (§5.2), `colorNeutralBackgroundStatic` (§3.7) |
| List pane | ~280–320px, resizable | Scrollable rows, `colorNeutralBackground1` |
| Content pane | Remainder of window width | The primary working surface |
| Top command bar | Full width, ~48px tall | Sits above the list + content panes, houses search and global commands |

- The nav rail is **fixed-width and never scrolls horizontally** —
  vertical stacking only, scrolling only if the icon list overflows
  vertically.
- The list pane and content pane sit side by side, separated by a
  `colorNeutralStroke2` hairline; the list pane is user-resizable by
  dragging that hairline in the desktop client.
- On narrow/mobile viewports, this collapses to a single visible
  pane at a time with the nav rail becoming a bottom tab bar — treat
  this as a distinct responsive breakpoint, not a squeeze of the
  three-pane layout.

---

## 7. Corner Radius & Stroke Width

### 7.1 Corner Radius

| Token | Value | Use for |
|---|---|---|
| `borderRadiusNone` | 0px | Full-bleed surfaces, edge-to-edge images. |
| `borderRadiusSmall` | 2px | Small controls — checkboxes, tags, compact chips. |
| `borderRadiusMedium` | 4px | **The default** — buttons, inputs, most cards and panels. |
| `borderRadiusLarge` | 6px | Larger cards, dialogs, popovers. |
| `borderRadiusXLarge` | 8px | Prominent containers — large modal surfaces. |
| `borderRadiusCircular` | 9999px | Avatars, presence dots, pill-shaped badges, fully round icon buttons. |

**Default assumption:** if a component's radius isn't specified
elsewhere, use `borderRadiusMedium` (4px). This is Fluent 2's default
across the vast majority of surfaces — don't reach for Large/XLarge
without a specific reason (a dialog, a prominent card).

### 7.2 Stroke Width

| Token | Value | Use for |
|---|---|---|
| `strokeWidthThin` | 1px | Default border weight — inputs, dividers, card outlines. |
| `strokeWidthThick` | 2px | Emphasized borders — a focused input's border, a selected card's outline. |
| `strokeWidthThicker` | 3px | Rare, strong emphasis. |
| `strokeWidthThickest` | 4px | Rarest — reserved for a component that needs maximum border weight (some focus-ring implementations). |

---

## 8. Elevation & Shadow

Fluent uses a **dual-shadow technique** — every elevation level pairs
a tight, dark "key" shadow with a wider, softer "ambient" shadow, not
a single flat drop-shadow. This is what gives Fluent surfaces their
specific soft, layered depth rather than a harsh single-direction
shadow.

### 8.1 The Shadow Ramp — Exact Values

| Token | CSS `box-shadow` value | Use for |
|---|---|---|
| `shadow2` | `0 1px 2px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)` | Minimal lift — a raised list row, a subtle hover card. |
| `shadow4` | `0 2px 4px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)` | **Cards, the focused compose box, command-adjacent surfaces.** |
| `shadow8` | `0 4px 8px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)` | Dropdown menus, command dropdowns, tooltips. |
| `shadow16` | `0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12)` | Flyouts, callouts, hover cards, popovers. |
| `shadow28` | `0 14px 28px rgba(0,0,0,0.24), 0 0 8px rgba(0,0,0,0.20)` | Dialogs, modals, side-navigation panels, bottom sheets. |
| `shadow64` | `0 32px 64px rgba(0,0,0,0.24), 0 0 8px rgba(0,0,0,0.20)` | Full-screen panels, pop-up dialogs at maximum prominence. |

Dark theme uses the same structural shadow shape with adjusted
opacity (roughly 20–28% ambient, 20% key at low elevations) —
reference the theme's own dark shadow tokens rather than reusing the
light values verbatim, since flat-copying light shadows onto a dark
background reads as too subtle to register.

### 8.2 Elevation Usage Map — Teams Specifically

| Teams element | Shadow token |
|---|---|
| Compose box (focused state) | `shadow4` |
| Hover card (persona card on avatar hover) | `shadow8` or `shadow16` |
| Command-bar dropdown / "..." overflow menu | `shadow8` |
| Emoji/reaction picker flyout | `shadow16` |
| Modal dialog (e.g. "Leave team?" confirmation) | `shadow28` |
| Full app-switcher or settings panel | `shadow64` |

**Rule:** elevation must increase monotonically with layering — a
flyout launched from inside a dialog needs a *higher* shadow token
than the dialog beneath it (e.g. a `shadow28` dialog spawning a
`shadow64`-level nested picker would be wrong; keep the nested
element's shadow token equal to or one step above its parent's).
Never assign a shadow token arbitrarily — pick by the surface's
actual stacking role from this table.

---

## 9. Materials — Acrylic & Mica

Fluent 2's two signature translucent materials. Both are
**Windows-native effects** — full-fidelity blur-through-desktop
rendering is a Windows/WinUI capability, not something the web
platform (a browser DOM) can reproduce pixel-for-pixel. Treat this
section as: use these on native Windows surfaces at full fidelity;
approximate with `backdrop-filter: blur()` plus a semi-transparent
background on web, and treat the approximation as a stated deviation,
not a bug.

| Material | What it is | Where Teams uses it |
|---|---|---|
| **Acrylic** | A translucent, blurred material — samples and blurs whatever's behind the surface (desktop wallpaper, other windows), then tints it. Two flavors: **Background Acrylic** (blurs the whole desktop behind the app window, ~30px blur radius) and **In-app Acrylic** (blurs only content within the same app, used for transient surfaces like flyouts). | The navigation rail and the top command bar in the native desktop client use Background Acrylic. Transient overflow menus and command-bar dropdowns use In-app Acrylic. |
| **Mica** | A more subtle, opaque-appearing material introduced for Windows 11 — samples the desktop wallpaper's color at a low frequency and blends it very subtly into a mostly-opaque background, rather than a strong live blur. Cheaper to render than Acrylic; intended for a window's large, persistent background regions. | Less prominent in Teams specifically than in first-party Windows apps (File Explorer, Settings) — if reproducing a Windows-native Teams-adjacent app, use Mica for the main window background and reserve Acrylic for transient/floating surfaces. |

**Web approximation (when native Acrylic isn't available):**

```css
.acrylic-approximation {
  background-color: rgba(255, 255, 255, 0.7); /* light theme */
  backdrop-filter: blur(30px) saturate(125%);
  -webkit-backdrop-filter: blur(30px) saturate(125%);
}
```

**Rule:** never apply Acrylic/Mica to a primary reading surface (the
message list, document body text) — translucency belongs on
structural chrome (nav rails, command bars, transient flyouts), never
behind body text a person needs to read for any length of time. This
mirrors why Teams' actual chat pane is a solid `colorNeutralBackground1`
(§3.7) even in a client where the nav rail is Acrylic.

---

## 10. Motion System

### 10.1 Duration Tokens

| Token | Value | Use for |
|---|---|---|
| `durationUltraFast` | 50ms | Micro-interactions — a focus ring appearing. |
| `durationFaster` | 100ms | Icon swaps (the Regular→Filled nav-icon change, §5.3), small state changes. |
| `durationFast` | 150ms | Component state transitions — button hover/press color changes. |
| `durationNormal` | 200ms | **The default** — most transitions that don't have a more specific token. |
| `durationGentle` | 250ms | Content appearing — a new message sliding into a list. |
| `durationSlow` | 300ms | Page sections, drawers, panels sliding open. |
| `durationSlower` | 400ms | Complex, orchestrated multi-element sequences. |
| `durationUltraSlow` | 500ms | Full-page transitions — rare inside a single-window app like Teams. |

### 10.2 Easing Curves — Exact `cubic-bezier` Values

| Token | Curve | Use for |
|---|---|---|
| `curveAccelerateMax` | `cubic-bezier(0.9, 0.1, 1, 0.2)` | Strongest acceleration — an element snapping out of view. |
| `curveAccelerateMid` | `cubic-bezier(1, 0, 1, 1)` | Standard acceleration — used as the general "Ease In" for exits. |
| `curveAccelerateMin` | `cubic-bezier(0.8, 0, 0.78, 1)` | Gentlest acceleration. |
| `curveDecelerateMax` | `cubic-bezier(0.1, 0.9, 0.2, 1)` | Strongest deceleration — an element snapping into place. |
| `curveDecelerateMid` | `cubic-bezier(0, 0, 0, 1)` | Standard deceleration — used as the general "Ease Out" for entrances. |
| `curveDecelerateMin` | `cubic-bezier(0.33, 0, 0.1, 1)` | Gentlest deceleration. |
| `curveEasyEaseMax` | `cubic-bezier(0.8, 0, 0.2, 1)` | Strong ease-in-out — large repositioning moves. |
| `curveEasyEase` | `cubic-bezier(0.33, 0, 0.67, 1)` | **The default ease-in-out** — most moves within the screen (a panel resizing, a list item reordering). |
| `curveLinear` | `cubic-bezier(0, 0, 1, 1)` | Constant-rate motion only — a loading spinner's continuous rotation. Never used for anything that starts or stops. |

### 10.3 The Core Motion Rule

- **Elements entering the screen → Decelerate** (`curveDecelerateMid`,
  i.e. Ease Out). They arrive with energy and settle — never arrive
  at constant speed and stop abruptly.
- **Elements leaving the screen → Accelerate** (`curveAccelerateMid`,
  i.e. Ease In). They start slow and speed up on the way out — never
  linger at full opacity/size right up to the moment they vanish.
- **Elements moving within the screen** (repositioning, resizing) →
  **Ease In-Out** (`curveEasyEase`).
- **Linear** (`curveLinear`) is reserved exclusively for continuous,
  non-stopping motion — a spinner, a progress shimmer. Never apply
  linear easing to anything with a defined start and end state; it
  reads as mechanical, not natural.

### 10.4 Applied to a Teams-Style Interface

| Interaction | Duration | Curve |
|---|---|---|
| Nav icon Regular→Filled swap on selection | `durationFaster` (100ms) | `curveEasyEase` |
| Button hover/press background change | `durationFast` (150ms) | `curveEasyEase` |
| New message appearing in the list | `durationGentle` (250ms), combined with an opacity + slight translate-Y | `curveDecelerateMid` (entering) |
| A flyout/dropdown opening | `durationNormal`–`durationSlow` (200–300ms) | `curveDecelerateMid` on open, `curveAccelerateMid` on close |
| List pane resize drag | No transition — follows the pointer 1:1, this is a direct-manipulation gesture, not an animated state change | — |
| Typing indicator dots | Continuous loop | `curveLinear` for the loop itself, but the dots' individual scale pulses use `curveEasyEase` |

**Reduced motion:** every transition above must respect
`prefers-reduced-motion`. When it's set, cut duration close to
instantaneous (a handful of milliseconds) rather than removing the
state change outright — the person should still see that something
changed, just without the eased motion getting them there.

---

## 11. Component Patterns to Reproduce Teams Specifically

Beyond the raw tokens, a handful of interaction patterns are what
actually make an interface *read* as Teams rather than just
"a Fluent app." Get these specifically right:

1. **Nav rail active-state indicator.** A 2–3px vertical bar in
   `colorBrandBackground`, flush to the inside edge of the active nav
   icon, combined with the Regular→Filled icon swap (§5.3) and the
   icon color shifting to `colorBrandForeground1`. This is the single
   most recognizable Teams chrome detail.
2. **List-row hover reveal.** A chat/channel row in the list pane is
   visually quiet at rest. On hover, a row-level command affordance
   (mute, pin, more options `...`) fades in on the trailing edge of
   the row using `colorSubtleBackground`'s hover step underneath and
   `durationFast`/`curveEasyEase` for the icon fade-in — never present
   at rest, never a hard cut on hover.
3. **Message hover reveal.** Hovering a message in the content pane
   reveals a small floating command bar (react, reply, more options)
   anchored to the message's top-right corner, elevated at `shadow4`
   or `shadow8`, appearing with `durationFast` and disappearing the
   instant the pointer leaves the message's bounding box.
4. **Presence dot.** A `borderRadiusCircular` dot, ~10–12px, using the
   status colors from §3.5/§3.7, positioned overlapping the
   bottom-right of a `borderRadiusCircular` avatar with a
   1–2px `colorNeutralBackground1`-colored ring separating the dot
   from the avatar image beneath it (so the dot reads as sitting on
   top, not blending into the photo).
5. **Compose box focus state.** At rest: `colorNeutralStroke1` border,
   no shadow. On focus: border shifts to `colorBrandStroke1`
   (2px, `strokeWidthThick`), and `shadow4` appears beneath the whole
   compose surface — over `durationFast`/`curveEasyEase`.
6. **Unread/mention badges.** A small `borderRadiusCircular` badge
   with `colorBrandBackground` (unread count) or
   `colorStatusDangerBackground3` (mention count) fill, white numeral
   text at `Caption1Strong`, positioned top-right-overlapping on the
   nav rail icon or list-row avatar it belongs to.

---

## 12. Dark Mode & Theme Switching

- Every color alias token in §3 resolves differently under
  `webLightTheme` vs. `webDarkTheme` (and Teams ships its own
  `teamsDarkTheme` variant, tuned slightly darker/higher-contrast than
  the generic Fluent dark theme) — the token **name** never changes
  between themes, only the value it resolves to. This is the entire
  point of building against alias tokens rather than raw hex: a
  correctly token-built component needs zero code changes to support
  dark mode.
- Every interactive background/foreground/stroke token carries its
  own Rest/Hover/Pressed/Selected states *per theme* — dark mode isn't
  "light mode inverted," it's a separately calibrated set of values
  for the same semantic roles, because a simple inversion produces
  poor contrast in practice.
- Icons (§5.4) inherit `currentColor`, so they need no separate
  dark-mode variant — they follow whatever text-color token they're
  paired with.
- Shadows (§8.1) need separate dark-theme opacity values, not the
  light-theme box-shadow reused verbatim (§8.1's note).
- Never hardcode a `prefers-color-scheme` media query check inside
  component logic to swap colors manually — apply the correct theme
  object at the app's root provider and let every token underneath
  resolve automatically.

---

## 13. Accessibility Requirements — Non-Negotiable

- **Contrast:** body text and interactive components clear 4.5:1
  against their background; large text (18px+ regular or 14px+ bold)
  and non-text UI elements (icons, borders that convey state) clear
  3:1. The alias tokens in §3 are pre-calibrated to these ratios when
  paired correctly (e.g. `colorNeutralForeground1` on
  `colorNeutralBackground1`) — don't recombine tokens outside their
  intended pairings without re-checking contrast yourself.
- **Focus ring:** every interactive element gets a visible
  keyboard-focus indicator — a 2px outline using the theme's focus
  stroke tokens (`colorStrokeFocus1`/`colorStrokeFocus2`, a
  light/dark double-ring technique for legibility against any
  background), never `outline: none` without a substitute.
- **Never convey state by color alone.** A presence dot's color
  (§3.7) is always paired with an accessible label ("Available,"
  "Away," "Busy") for screen readers — the color is a visual
  accelerant, not the only signal.
- **Icon-only buttons** need an `aria-label` — Fluent icon components
  render no accessible name on their own.
- **Reduced motion** — see §10.4's closing note.
- **High contrast theme** — Fluent ships a dedicated
  `createHighContrastTheme()` that most alias tokens resolve through
  automatically; don't build a component that only works under the
  standard light/dark themes and silently breaks under high contrast.

---

## 14. Implementation Reference

### 14.1 Web (React) — the Direct Path to This Exact System

```bash
npm install @fluentui/react-components @fluentui/react-icons
```

```tsx
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';

function App() {
  return (
    <FluentProvider theme={webLightTheme /* or webDarkTheme */}>
      {/* Your app */}
    </FluentProvider>
  );
}
```

Once wrapped in `FluentProvider`, every token in this guide becomes a
CSS custom property (`var(--colorNeutralBackground1)`, etc.) available
throughout the tree, and every `@fluentui/react-components` primitive
(`Button`, `Input`, `Card`, `Text`, `Avatar`, `Badge`) is already built
against them — reach for these primitives before hand-rolling a
component from scratch.

```tsx
import { tokens, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  navRail: {
    backgroundColor: tokens.colorNeutralBackgroundStatic,
    width: '68px',
  },
  activeIcon: {
    color: tokens.colorBrandForeground1,
    transitionDuration: tokens.durationFaster,
    transitionTimingFunction: tokens.curveEasyEase,
  },
  composeBox: {
    borderColor: tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusMedium,
    ':focus-within': {
      borderColor: tokens.colorBrandStroke1,
      boxShadow: tokens.shadow4,
    },
  },
});
```

### 14.2 Icons

```tsx
import { Mail24Regular, Mail24Filled } from '@fluentui/react-icons';

// Rest state
<Mail24Regular />
// Active/selected state
<Mail24Filled style={{ color: tokens.colorBrandForeground1 }} />
```

### 14.3 Non-Web Platforms

| Platform | Package/resource |
|---|---|
| Windows (WinUI/XAML) | `Microsoft.WindowsAppSDK`'s Fluent-themed controls, Segoe UI Variable, Segoe Fluent Icons font |
| iOS | `fluentui-apple` (Swift/SwiftUI + UIKit) |
| macOS | `fluentui-apple` (AppKit-based) |
| Android | Fluent-themed Jetpack Compose components (community/internal Microsoft implementations) |

Regardless of platform, the token *names* and *semantic roles* in
this guide stay constant — only the delivery mechanism (CSS variable
vs. Swift enum vs. XAML resource) changes.

---

## 15. Definition of Done — Pre-Ship Checklist

Before calling any surface "Fluent 2 / Teams-styled," confirm every
line:

- [ ] No raw hex code, pixel value, or `cubic-bezier` curve appears
      anywhere in component code — every value is a referenced token.
- [ ] Every background/foreground/stroke pairing clears its required
      contrast ratio (§13).
- [ ] Body text uses `Body1` (14px/20px) by default; headings use
      Semibold weight, never Bold or Regular (§4.2).
- [ ] All icons come from `@fluentui/react-icons` / Fluent System
      Icons — no mixed icon families (§5.1).
- [ ] Icon sizes follow the context map in §5.2 (24px nav, 20px
      toolbar, 16px inline) — not an arbitrary size per icon.
- [ ] Selected/active icons use the Filled variant; every other state
      uses Regular (§5.3).
- [ ] Every spacing value is a step on the 4px scale (§6.1) — nothing
      hand-picked.
- [ ] The three-pane layout skeleton (nav rail / list pane / content
      pane) is structurally present if reproducing the main Teams
      window (§6.2).
- [ ] Corner radius defaults to `borderRadiusMedium` (4px) unless a
      component has a stated reason to deviate (§7.1).
- [ ] Elevation increases monotonically with actual stacking order —
      no nested surface sits at a lower shadow token than its parent
      (§8.2).
- [ ] Acrylic/Mica, if used, sits only on structural chrome — never
      behind primary reading content (§9).
- [ ] Every transition uses a token duration and a token curve, with
      entrances decelerating and exits accelerating (§10.3).
- [ ] Dark mode works by swapping the theme object at the provider
      root — zero component-level conditional color logic (§12).
- [ ] `prefers-reduced-motion` is respected everywhere a transition
      exists.

All checked → the interface is built on Fluent 2's actual system, not
an approximation of it.

---

*Design Guide maintained as a build reference. Token values reflect
Fluent UI React v9 / Fluent 2 as publicly documented by Microsoft;
verify against `fluent2.microsoft.design` and the
`microsoft/fluentui` repository if a value is ever in doubt, since
the system evolves and specific hex/pixel values can shift between
releases.*
