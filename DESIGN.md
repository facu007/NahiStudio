---
name: "Nahi Studio — Two Sides, One Identity"
description: "Dark editorial and contemporary art design system unifying Nail Art and Tattoo Art under one cohesive metallic-and-ink identity."
---

## Overview

Nahi Studio ("TWO SIDES. ONE IDENTITY.") is an artistic, dark-minimalist editorial universe for multidisciplinary artist Nahi Ciamprone, uniting **Nail Art** and **Tattoo Art** as two faces of the same coin. The visual language blends alternative fashion editorial, underground grunge restraint, and analog studio craft—eschewing generic beauty salon tropes in favor of deep obsidian surfaces, bone-white typography, chrome-silver metallic reflections, and oxblood ink accents.

## Colors

The palette is anchored in deep obsidian (`#111111`) and bone white (`#F1ECE5`), accented by steel gray (`#8C8C8C`), chrome silver (`#C7C7C7`), and a deep oxblood crimson (`#8B2635`) representing both nail lacquer and tattoo ink.

- **Background & Surface (`#111111`):** Deep obsidian ground with subtle tonal elevation steps (`#181818`, `#1E1E1E`, `#282828`).
- **Primary (`#F1ECE5`):** Bone white for primary calls to action, editorial headlines, and high-contrast focal elements.
- **Secondary (`#C7C7C7`):** Chrome silver for metallic coin rims, hairline dividers, and secondary metadata.
- **Accent (`#8B2635`):** Oxblood crimson used sparingly for discipline highlights, active states, and conversion moments.

```yaml
colors:
  background: "#111111"
  on-background: "#F1ECE5"
  surface: "#111111"
  on-surface: "#F1ECE5"
  surface-container-low: "#181818"
  surface-container: "#1E1E1E"
  surface-container-high: "#282828"
  on-surface-variant: "#C7C7C7"
  outline: "#8C8C8C"
  outline-variant: "#333333"
  primary: "#F1ECE5"
  on-primary: "#111111"
  secondary: "#C7C7C7"
  on-secondary: "#111111"
  accent: "#8B2635"
  on-accent: "#F1ECE5"
  error: "#FFB4AB"
  on-error: "#690005"
```

## Typography

A high-contrast editorial pairing: **Playfair Display** brings fashion-magazine drama to display and section titles, **Raleway** provides crisp geometric legibility for body copy and forms, and **Spline Sans Mono** anchors discipline indices (`01 — NAIL ART`, `02 — TATTOO ART`), dimensions, and studio metadata.

```yaml
typography:
  display-lg:
    fontFamily: "Playfair Display"
    fontSize: 64px
    fontWeight: 500
    lineHeight: 68px
    letterSpacing: -1.5px
  display-lg-mobile:
    fontFamily: "Playfair Display"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 36px
    letterSpacing: -0.5px
  display-md:
    fontFamily: "Playfair Display"
    fontSize: 44px
    fontWeight: 500
    lineHeight: 48px
    letterSpacing: -0.75px
  display-md-mobile:
    fontFamily: "Playfair Display"
    fontSize: 28px
    fontWeight: 500
    lineHeight: 32px
    letterSpacing: -0.25px
  headline-lg:
    fontFamily: "Playfair Display"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 38px
    letterSpacing: -0.25px
  headline-md:
    fontFamily: "Playfair Display"
    fontSize: 24px
    fontWeight: 500
    lineHeight: 30px
    letterSpacing: 0px
  title-md:
    fontFamily: "Raleway"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0.25px
  body-lg:
    fontFamily: "Raleway"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 26px
    letterSpacing: 0px
  body-md:
    fontFamily: "Raleway"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 0.1px
  label-lg:
    fontFamily: "Spline Sans Mono"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 18px
    letterSpacing: 1.5px
  label-md:
    fontFamily: "Spline Sans Mono"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: 1.2px
  label-sm:
    fontFamily: "Spline Sans Mono"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 14px
    letterSpacing: 1px
```

## Layout & Spacing

The layout uses an asymmetric 12-column editorial grid on desktop (max-width `1280px`) collapsing cleanly to a single-column mobile-first flow (`390px`), built on an `8px` spatial rhythm with generous negative space between chapters.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  gutter-xl: 32px
  section: 64px
  page-margin: 24px
```

## Elevation & Depth

Depth is achieved through subtle tonal layering (`#111111` → `#181818` → `#1E1E1E`) and razor-thin `1px` chrome/steel hairlines (`outline-variant` `#333333`) rather than heavy drop shadows or frosted glass. Interactive cards and gallery frames use crisp contrast shifts and metallic sheen borders on hover.

## Shapes

Architectural, sharp-edged editorial geometry (`0px` to `4px` radii) for gallery frames, flash cards, and form inputs, contrasted with `9999px` circular geometry reserved strictly for the 3D two-sided coin and floating action triggers.

```yaml
rounded:
  none: 0px
  sm: 2px
  DEFAULT: 4px
  md: 8px
  full: 9999px
```

## Motion & Micro-interaction

Motion is deliberate, weighted, and metallic. The signature 3D coin rotates smoothly on a continuous axis (`transform: rotateY`) and responds to pointer hover or click to flip between the Nail Art and Tattoo Art faces. Scroll reveals and gallery hovers animate `transform` and `opacity` only, honoring `prefers-reduced-motion`.

```yaml
motion:
  state-change:
    duration: 180ms
    delay: 0ms
    timingFunction: cubic-bezier(0.25, 0.1, 0.25, 1)
  surface-enter:
    duration: 400ms
    delay: 0ms
    timingFunction: cubic-bezier(0.16, 1, 0.3, 1)
  coin-flip:
    duration: 700ms
    delay: 0ms
    timingFunction: cubic-bezier(0.22, 1, 0.36, 1)
```

## Voice & Content Strategy

Editorial, bilingual-ready Spanish with English conceptual anchors (`TWO SIDES. ONE IDENTITY.`, `ONE ARTIST. TWO EXPRESSIONS.`, `TWO SIDES. ONE SOUL. ENDLESS WAYS TO CREATE.`). Copy is concise, confident, and authentic—never generic salon clichés. All portfolio items, prices, bio details, and schedules are clearly marked as editable placeholders until Nahi's real assets are plugged in.

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Button** → `@components/button.html`: `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html`: `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Input Field** → `@components/input-field.html`: `input-field-text`, `input-field-icon`
- **Modal** → `@components/modal.html`: `modal-standard`, `modal-alert`, `modal-drawer`
