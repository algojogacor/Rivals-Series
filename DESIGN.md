# DESIGN SYSTEM & TOKENS: RIVALS SERIES SEASON 1 (RS S1)

/* Hallmark · genre: editorial · macrostructure: Sports Editorial & Match Operations Center · theme: Midnight Tactical */
/* Impeccable · surface: operate + read · audience: 2 participants + public followers */

## 1. Visual Anchor & Brand Source
The design language is directly derived from the official RS S1 regulations book cover (`rivals_series_season_1_cover.svg` & `cover_artwork_s1.png`). It balances the discipline of an official sports federation publication with the tactical precision of an eFootball competition.

## 2. Color Palette (OKLCH & CSS Custom Properties)

```css
:root {
  /* Brand Canvas & Surfaces */
  --color-canvas: #0C1728;          /* Deep Midnight Tactical Navy (Cover Base) */
  --color-surface: #121F33;         /* Panel Navy (Container / Elevated) */
  --color-surface-hover: #172740;   /* Interactive Surface Hover */
  --color-surface-subtle: #08101C;  /* Recessed Ground */

  /* Text & Ink */
  --color-ink-primary: #EEE6DA;     /* Warm Ivory (Primary Editorial Ink) */
  --color-ink-secondary: #94A3B8;   /* Muted Slate Text */
  --color-ink-tertiary: #64748B;    /* Hairline / Metadata Label Ink */
  --color-ink-inverse: #0C1728;     /* Midnight Navy on Ivory buttons */

  /* Accents & Signals */
  --color-accent-crimson: #E53430;  /* Competition Crimson (Brand Bar & Urgency) */
  --color-accent-crimson-hover: #FF423E;
  --color-accent-gold: #EAB308;     /* Championship & Award Highlights */
  --color-accent-emerald: #10B981;  /* Confirmed / Completed Status */
  --color-accent-amber: #F59E0B;    /* Awaiting Confirmation / Pending */
  --color-accent-cyan: #06B6D4;     /* Reconstructed / Technical Win */

  /* Architectural Borders */
  --color-border: #1E2E48;          /* Standard Grid Hairline */
  --color-border-subtle: #152238;   /* Subtle Table Dividers */
  --color-border-active: #E53430;   /* Active State / Focus Outline */

  /* Pitch Linework */
  --color-pitch-line: rgba(125, 135, 148, 0.18);
}
```

## 3. Typography System
- **Display & Headings:** `Space Grotesk`, `Outfit`, or geometric sans-serif. Always roman (`font-style: normal`). No italic headers. Generous letter-spacing on uppercase labels (`tracking-wider`).
- **Body & Editorial Content:** High-legibility system sans (`Inter`, `system-ui`). Line-height set to `1.5` to `1.6` for reading ease.
- **Data & Numerals:** Strict `font-variant-numeric: tabular-nums` across all scores, standings columns, match minutes, and statistics to ensure rock-solid vertical alignment.
- **Heading Scale:**
  - `H1 / Banner`: 2.25rem (36px) – 3rem (48px), bold, uppercase.
  - `H2 / Section Title`: 1.5rem (24px) – 1.75rem (28px), bold with leading crimson pip (`■`).
  - `H3 / Subsection`: 1.125rem (18px) – 1.25rem (20px), semibold.
  - `Body`: 0.9375rem (15px) – 1rem (16px), regular.
  - `Caption / Meta`: 0.75rem (12px) – 0.8125rem (13px), medium tracking.

## 4. Spacing Scale & Layout Rhythm
- Strict 4-pt grid system: `space-1` (4px), `space-2` (8px), `space-3` (12px), `space-4` (16px), `space-6` (24px), `space-8` (32px), `space-12` (48px).
- Maximum container width: `72rem` (1152px) for structured editorial density without excessive whitespace drift on ultra-wide screens.
- Tables take full available width with strict columnar percentages.

## 5. Micro-Interactions & States
- **Hover Transitions:** 150ms ease-out on background-color and border-color.
- **Focus Rings:** 2px solid `var(--color-accent-crimson)` with 2px offset.
- **Status Badges:** Semantically paired badge with icon or textual indicator (never color alone):
  - `Scheduled`: Slate hairline border + dot.
  - `Awaiting Confirmation`: Amber tint + clock indicator.
  - `Confirmed`: Emerald tint + check indicator.
  - `Disputed`: Crimson tint + alert indicator.
  - `Reconstructed`: Cyan tint + refresh indicator.
  - `Forfeited` / `Technical Win`: Purple or distinct geometric outline.

## 6. Anti-Slop Safeguards (Hallmark & Impeccable)
1. No generic centered hero with purple-blue gradients or glowing orbs.
2. No nested cards inside cards; content sections use hairline borders and subtle surface step-downs.
3. No fake metrics, fabricated match scores, or artificial countdown clocks.
4. Tabular standings must look like an official federation document, not a crypto dashboard.
5. All 8 component states implemented for interactive inputs: default, hover, focus-visible, active, disabled, loading, error, success.
