---
name: Code Review
description: Minimal AI code review landing and tool surface.
colors:
  white: "#ffffff"
  graphite-ink: "#171717"
  void-black: "#0a0a0a"
  soft-white: "#ededed"
  zinc-50: "#fafafa"
  zinc-100: "#f4f4f5"
  zinc-200: "#e4e4e7"
  zinc-300: "#d4d4d8"
  zinc-400: "#a1a1aa"
  zinc-500: "#71717a"
  zinc-700: "#3f3f46"
  zinc-800: "#27272a"
  zinc-900: "#18181b"
  zinc-950: "#09090b"
  focus-blue: "#3b82f6"
  error-bg: "#fef2f2"
  error-border: "#fecaca"
  error-text: "#991b1b"
typography:
  display:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
    letterSpacing: "normal"
  headline:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: "normal"
  title:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "normal"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  scrollbar: "3px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.zinc-900}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.zinc-800}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  input-code:
    backgroundColor: "{colors.zinc-50}"
    textColor: "{colors.zinc-900}"
    typography: "{typography.mono}"
    rounded: "{rounded.lg}"
    padding: "16px"
  result-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.zinc-700}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Code Review

## 1. Overview

**Creative North Star: "The Bench Light"**

Code Review currently uses a flat, restrained interface that behaves like a clean workbench: a place to paste code, run a review, and read findings without decorative interference. The system is mostly white, zinc, and near-black, with borders doing the work that shadows often do elsewhere.

The brand context asks for minimalism and explicitly rejects dark-purple AI SaaS. This design system should preserve the plainspoken restraint in the existing UI while giving future landing work enough structure to feel intentional rather than default.

**Key Characteristics:**
- Restrained monochrome foundation with sparse state color.
- Flat surfaces, visible borders, and compact radii.
- Geist sans for product language, Geist Mono only where code is the material.
- Clear two-column working layout on desktop, stacked flow on smaller screens.
- No glossy AI motifs, neon gradients, or dark-purple presentation tropes.

## 2. Colors

The current palette is monochrome and functional: white and near-black define the page, zinc neutrals define hierarchy, blue appears only for focus, and red appears only for errors.

### Primary
- **Graphite Action** (#18181b): The primary action fill for "Run Review" in light mode. Use it for decisive calls to action, not decoration.
- **Inverted Action** (#ededed): The primary action fill in dark mode, paired with near-black text.

### Secondary
- **Field Blue** (#3b82f6): The focus color on code input fields. Keep it as an interaction signal, not a brand wash.

### Tertiary
- **Review Red** (#991b1b): Error text for failed review requests, paired with pale red background and border.

### Neutral
- **Pure White** (#ffffff): Main light background, navbar background, result panel background.
- **Graphite Ink** (#171717): Global light foreground.
- **Void Black** (#0a0a0a): Main dark background.
- **Soft White** (#ededed): Global dark foreground.
- **Zinc Field** (#fafafa): Code textarea background in light mode.
- **Zinc Line** (#d4d4d8): Standard field and dashed empty-state border in light mode.
- **Zinc Copy** (#3f3f46): Secondary body copy in light mode.
- **Zinc Muted** (#71717a): Small metadata and token counter text.
- **Zinc Panel Dark** (#18181b): Dark-mode field and panel background.
- **Zinc Line Dark** (#3f3f46): Standard field and empty-state border in dark mode.

### Named Rules
**The Restraint Rule.** Use one strong action color per surface. Today that color is graphite, with blue reserved for focus and red reserved for errors.

**The No Purple AI Rule.** Do not introduce dark-purple gradients, neon violet glows, or glossy AI surfaces. If a future brand accent is added, it must support minimal precision instead of signaling generic AI.

## 3. Typography

**Display Font:** Geist, with Arial, Helvetica, sans-serif fallback.
**Body Font:** Geist, with Arial, Helvetica, sans-serif fallback.
**Label/Mono Font:** Geist Mono for code input and code-adjacent material only.

**Character:** The type system is plain, compact, and work-focused. It gets hierarchy from weight and spacing rather than expressive font pairing.

### Hierarchy
- **Display** (700, 1.5rem, 1.33): Page title and future landing hero baseline. For brand work, increase scale carefully, with `clamp()` max at or below 6rem.
- **Headline** (600, 1.125rem, 1.55): Section headings such as Results.
- **Title** (600, 1rem, 1.5): Compact labels inside rendered review content.
- **Body** (400, 0.875rem, 1.5): Paragraphs, review text, and empty-state copy. Keep longer explanatory text around 65 to 75 characters per line.
- **Label** (500, 0.875rem, 1.5): Form labels, button text, and compact controls.
- **Mono** (400, 0.875rem, 1.5): Code textarea input and code-specific surfaces. Do not use mono as a generic developer-brand costume.

### Named Rules
**The Code Is The Texture Rule.** Monospace belongs to code and code output. The surrounding brand voice stays in Geist sans.

## 4. Elevation

This system uses no shadows in the current UI. Depth is conveyed through tonal layering, borders, dashed states, and scroll containment. Keep shadows out of the base vocabulary unless a future surface needs motion or hover feedback that cannot be solved with color and border state.

### Named Rules
**The Flat By Default Rule.** Surfaces sit on the page. Use borders, background shifts, and spacing before adding a shadow.

## 5. Components

### Buttons
- **Shape:** Compact rounded rectangle (8px).
- **Primary:** `zinc-900` background with white text in light mode, inverted to soft white with zinc text in dark mode. Padding is 10px vertical and 20px horizontal.
- **Hover / Focus:** Hover shifts one zinc step, `transition-colors` handles the state. Add `focus-visible` rings when refining buttons so keyboard users receive the same clarity as textarea focus.
- **Disabled:** Cursor changes to not-allowed and opacity drops to 50 percent.

### Chips
- **Style:** Token usage metadata appears as a small chip with `zinc-100` background in light mode and `zinc-800` in dark mode.
- **State:** The current chip is informational only. If future chips become selectable, add selected, hover, focus, and disabled states rather than reusing passive metadata styling.

### Cards / Containers
- **Corner Style:** 8px radius.
- **Background:** White or zinc-50 in light mode; zinc-900 or zinc-950 in dark mode.
- **Shadow Strategy:** No shadows. Borders and tonal layers define containment.
- **Border:** 1px zinc borders, dashed for empty states only.
- **Internal Padding:** 16px for inputs and error states, 24px for result panels.

### Inputs / Fields
- **Style:** The code textarea uses zinc-50 background, zinc-300 border, 8px radius, 16px padding, and Geist Mono.
- **Focus:** Border shifts to Field Blue with a 1px blue ring.
- **Error / Disabled:** Disabled inputs use not-allowed cursor and 50 percent opacity. Errors are shown outside the input in a pale red bordered container.

### Navigation
- **Style:** Top nav is a 56px bar with white or zinc-950 background, a single bottom border, and a compact brand link. The avatar is circular and decorative; the link has an explicit accessible name.
- **Typography:** Brand text uses 1.125rem bold with tight tracking.
- **States:** Current nav has no hover or active treatment beyond the link target. Add subtle hover and focus-visible states before adding more navigation items.

### Review Markdown
- **Style:** Rendered review content uses compact headings, zinc body copy, bold emphasis for important phrases, and list spacing that keeps findings scannable.
- **Behavior:** Lists are grouped, paragraphs remain small, and the result panel scrolls independently with a custom foreground-colored scrollbar.

## 6. Do's and Don'ts

### Do:
- **Do** keep the palette restrained: white, near-black, zinc neutrals, one focus blue, one error red.
- **Do** use real review language: security, organization, readability, architecture, logic.
- **Do** preserve strong contrast for body text, placeholder text, controls, and error states.
- **Do** keep forms and results close together so the landing surface demonstrates the actual review workflow.
- **Do** add any future brand color with discipline, using it for identity and emphasis rather than generic AI decoration.

### Don't:
- **Don't** make this dark-purple AI SaaS.
- **Don't** use neon gradients, glossy AI motifs, glass panels, or template-like hero metrics.
- **Don't** use gradient text or repeated tiny uppercase section eyebrows.
- **Don't** use monospace for all brand copy just because the audience is developers.
- **Don't** pair 1px borders with large soft shadows on cards or buttons.
