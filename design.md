# Design — LMS Kajian UAH

A locked design system for the authentication and administration surfaces.

## Genre

Modern-minimal with a calm editorial undertone.

## Macrostructure family

- Authentication pages: split welcome and access panel; single primary form.
- App pages: workbench; summary first, action lanes second, detail last.
- Content pages: long document with restrained cards and readable measures.

## Theme

- `--color-paper`: oklch(98% 0.008 90)
- `--color-paper-2`: oklch(95% 0.012 90)
- `--color-ink`: oklch(20% 0.025 165)
- `--color-ink-2`: oklch(44% 0.018 165)
- `--color-rule`: oklch(86% 0.012 165)
- `--color-accent`: oklch(48% 0.12 160)
- `--color-focus`: oklch(70% 0.14 160)
- Navigation and account access use warm paper with quiet emerald accents; existing content components may keep slate workbench surfaces.

## Typography

- Display: project system sans, weight 700, normal style.
- Body: project system sans, weight 400–600.
- Mono: project system monospace, metadata only.
- Headings use compact tracking and no italics.

## Spacing

4-point named scale from `tokens.css`. Dense controls use 8–12px gaps; page sections use 24–32px gaps.

## Motion

- Motion-cut: colour and opacity transitions only.
- Reduced motion disables spinners and spatial movement.
- Focus rings appear immediately.

## Microinteractions stance

- Inline error feedback; silent success when state is already visible.
- Disabled controls use opacity, cursor, and native attributes.
- Destructive actions remain visually separated from primary navigation.

## CTA voice

- Primary: emerald fill, medium radius, verb-led copy.
- Secondary: quiet border or surface shift.

## Per-page allowances

- Login may use the logo as its only visual enrichment.
- Admin pages use no decorative enrichment; function carries the page.

## What pages MUST share

- Slate/emerald anchor palette.
- 44px minimum interactive target.
- Visible focus states and compact headings.
- Rounded rectangles, not excessive pill-shaped containers.

## What pages MAY differ on

- Authentication and navigation use warm paper; content workbenches retain their existing light/dark surfaces.
- Small screens show a compact welcome before the form; desktop adds program and schedule shortcuts.
- Dashboard density may increase at desktop widths.

## Exports

The canonical CSS export lives in `tokens.css` at the project root.

### CSS tokens

```css
/* Hallmark · genre: modern-minimal · design-system: design.md · contrast: pass */
:root {
  --color-paper: oklch(98% 0.008 90);
  --color-paper-2: oklch(95% 0.012 90);
  --color-surface: oklch(99% 0.004 90);
  --color-error: oklch(43% 0.15 25);
  --color-error-paper: oklch(97% 0.012 25);
  --color-ink: oklch(20% 0.025 165);
  --color-ink-2: oklch(44% 0.018 165);
  --color-rule: oklch(86% 0.012 165);
  --color-accent: oklch(48% 0.12 160);
  --color-accent-ink: oklch(99% 0.004 90);
  --color-focus: oklch(70% 0.14 160);
  --color-admin-canvas: oklch(17% 0.025 250);
  --color-admin-panel: oklch(21% 0.025 250);
  --color-admin-panel-2: oklch(25% 0.025 250);
  --color-admin-ink: oklch(96% 0.008 250);
  --color-admin-muted: oklch(70% 0.018 250);

  --font-display: ui-sans-serif, system-ui, sans-serif;
  --font-body: ui-sans-serif, system-ui, sans-serif;
  --font-outlier: ui-monospace, SFMono-Regular, Consolas, monospace;

  --space-3xs: 0.25rem;
  --space-2xs: 0.5rem;
  --space-xs: 0.75rem;
  --space-sm: 1rem;
  --space-md: 1.5rem;
  --space-lg: 2rem;
  --space-xl: 3rem;
  --space-2xl: 4.5rem;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.25rem;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-short: 160ms;
  --dur-medium: 240ms;

  --radius-input: 0.625rem;
  --radius-card: 0.875rem;
  --radius-panel: 1.25rem;
  --rule-thin: 1px;
}
```

### Tailwind v4

Optional portable export; the current app already imports `tokens.css`.

```css
@theme {
  --color-paper: oklch(98% 0.008 90);
  --color-paper-2: oklch(95% 0.012 90);
  --color-surface: oklch(99% 0.004 90);
  --color-error: oklch(43% 0.15 25);
  --color-error-paper: oklch(97% 0.012 25);
  --color-ink: oklch(20% 0.025 165);
  --color-ink-2: oklch(44% 0.018 165);
  --color-rule: oklch(86% 0.012 165);
  --color-accent: oklch(48% 0.12 160);
  --color-accent-ink: oklch(99% 0.004 90);
  --color-focus: oklch(70% 0.14 160);
  --color-admin-canvas: oklch(17% 0.025 250);
  --color-admin-panel: oklch(21% 0.025 250);
  --color-admin-panel-2: oklch(25% 0.025 250);
  --color-admin-ink: oklch(96% 0.008 250);
  --color-admin-muted: oklch(70% 0.018 250);
  --font-display: ui-sans-serif, system-ui, sans-serif;
  --font-body: ui-sans-serif, system-ui, sans-serif;
  --font-outlier: ui-monospace, SFMono-Regular, Consolas, monospace;
  --spacing-3xs: 0.25rem;
  --spacing-2xs: 0.5rem;
  --spacing-xs: 0.75rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4.5rem;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.25rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --dur-short: 160ms;
  --dur-medium: 240ms;
  --radius-input: 0.625rem;
  --radius-card: 0.875rem;
  --radius-panel: 1.25rem;
}
```

### DTCG

```json
{
  "color-paper": { "$value": "oklch(98% 0.008 90)", "$type": "color" },
  "color-paper-2": { "$value": "oklch(95% 0.012 90)", "$type": "color" },
  "color-surface": { "$value": "oklch(99% 0.004 90)", "$type": "color" },
  "color-error": { "$value": "oklch(43% 0.15 25)", "$type": "color" },
  "color-error-paper": { "$value": "oklch(97% 0.012 25)", "$type": "color" },
  "color-ink": { "$value": "oklch(20% 0.025 165)", "$type": "color" },
  "color-ink-2": { "$value": "oklch(44% 0.018 165)", "$type": "color" },
  "color-rule": { "$value": "oklch(86% 0.012 165)", "$type": "color" },
  "color-accent": { "$value": "oklch(48% 0.12 160)", "$type": "color" },
  "color-accent-ink": { "$value": "oklch(99% 0.004 90)", "$type": "color" },
  "color-focus": { "$value": "oklch(70% 0.14 160)", "$type": "color" },
  "color-admin-canvas": { "$value": "oklch(17% 0.025 250)", "$type": "color" },
  "color-admin-panel": { "$value": "oklch(21% 0.025 250)", "$type": "color" },
  "color-admin-panel-2": { "$value": "oklch(25% 0.025 250)", "$type": "color" },
  "color-admin-ink": { "$value": "oklch(96% 0.008 250)", "$type": "color" },
  "color-admin-muted": { "$value": "oklch(70% 0.018 250)", "$type": "color" },
  "font-display": { "$value": "ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" },
  "font-body": { "$value": "ui-sans-serif, system-ui, sans-serif", "$type": "fontFamily" },
  "font-outlier": { "$value": "ui-monospace, SFMono-Regular, Consolas, monospace", "$type": "fontFamily" },
  "space-3xs": { "$value": "0.25rem", "$type": "string" },
  "space-2xs": { "$value": "0.5rem", "$type": "string" },
  "space-xs": { "$value": "0.75rem", "$type": "string" },
  "space-sm": { "$value": "1rem", "$type": "string" },
  "space-md": { "$value": "1.5rem", "$type": "string" },
  "space-lg": { "$value": "2rem", "$type": "string" },
  "space-xl": { "$value": "3rem", "$type": "string" },
  "space-2xl": { "$value": "4.5rem", "$type": "string" },
  "text-xs": { "$value": "0.75rem", "$type": "string" },
  "text-sm": { "$value": "0.875rem", "$type": "string" },
  "text-md": { "$value": "1rem", "$type": "string" },
  "text-lg": { "$value": "1.25rem", "$type": "string" },
  "text-xl": { "$value": "1.75rem", "$type": "string" },
  "text-2xl": { "$value": "2.25rem", "$type": "string" },
  "ease-out": { "$value": "cubic-bezier(0.16, 1, 0.3, 1)", "$type": "string" },
  "ease-in": { "$value": "cubic-bezier(0.7, 0, 0.84, 0)", "$type": "string" },
  "ease-in-out": { "$value": "cubic-bezier(0.65, 0, 0.35, 1)", "$type": "string" },
  "dur-short": { "$value": "160ms", "$type": "duration" },
  "dur-medium": { "$value": "240ms", "$type": "duration" },
  "radius-input": { "$value": "0.625rem", "$type": "string" },
  "radius-card": { "$value": "0.875rem", "$type": "string" },
  "radius-panel": { "$value": "1.25rem", "$type": "string" },
  "rule-thin": { "$value": "1px", "$type": "string" }
}
```

### shadcn/ui (OKLCH consumer)

Portable mapping for components that read `oklch(var(--background))`. The existing app's HSL variables in `src/index.css` remain intact.

```css
:root {
  --background: 98% 0.008 90;
  --foreground: 20% 0.025 165;
  --card: 99% 0.004 90;
  --card-foreground: 20% 0.025 165;
  --popover: 99% 0.004 90;
  --popover-foreground: 20% 0.025 165;
  --primary: 48% 0.12 160;
  --primary-foreground: 99% 0.004 90;
  --secondary: 95% 0.012 90;
  --secondary-foreground: 44% 0.018 165;
  --muted: 95% 0.012 90;
  --muted-foreground: 44% 0.018 165;
  --accent: 48% 0.12 160;
  --accent-foreground: 99% 0.004 90;
  --destructive: 43% 0.15 25;
  --destructive-foreground: 99% 0.004 90;
  --border: 86% 0.012 165;
  --input: 86% 0.012 165;
  --ring: 48% 0.12 160;
  --radius: 0.875rem;
}
```
