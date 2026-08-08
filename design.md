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
- Admin canvas: deep green-tinted slate, never pure black.

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

- Authentication uses warm paper; admin uses dark workbench surfaces.
- Dashboard density may increase at desktop widths.

## Exports

The canonical CSS export lives in `tokens.css` at the project root.
