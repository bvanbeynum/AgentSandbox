---
name: Aperture Command System
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#40484e'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#70787f'
  outline-variant: '#bfc7cf'
  surface-tint: '#00658d'
  primary: '#004c6b'
  on-primary: '#ffffff'
  primary-container: '#00658d'
  on-primary-container: '#b0deff'
  inverse-primary: '#88cffc'
  secondary: '#8c4f00'
  on-secondary: '#ffffff'
  secondary-container: '#fd9924'
  on-secondary-container: '#663800'
  tertiary: '#40484a'
  on-tertiary: '#ffffff'
  tertiary-container: '#586062'
  on-tertiary-container: '#d2dadc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c6e7ff'
  primary-fixed-dim: '#88cffc'
  on-primary-fixed: '#001e2d'
  on-primary-fixed-variant: '#004c6b'
  secondary-fixed: '#ffdcbf'
  secondary-fixed-dim: '#ffb874'
  on-secondary-fixed: '#2d1600'
  on-secondary-fixed-variant: '#6b3b00'
  tertiary-fixed: '#dce4e6'
  tertiary-fixed-dim: '#c0c8ca'
  on-tertiary-fixed: '#151d1f'
  on-tertiary-fixed-variant: '#40484a'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
  primary-cyan: '#00AEEF'
  alert-amber: '#fd9924'
  laboratory-grey: '#e2e2e2'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 80px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.15em
  mono-data:
    fontFamily: monospace
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  gutter: 24px
  margin: 48px
  sidebar-width: 288px
---

## Brand & Style
The brand personality is clinical, authoritarian, and hyper-functional. It evokes a "Research Facility" aesthetic—reminiscent of brutalist industrial design mixed with mid-century modern computing. The UI is intentionally cold and precise, prioritizing data density and technical telemetry over warmth.

The design style is **Industrial Minimalism** with **Brutalist** influences. It utilizes sharp borders, monospaced data readouts, and a high-contrast utility palette. Every element feels like a physical instrument or a terminal readout in a high-stakes laboratory environment.

## Colors
The palette is dominated by a neutral "Clinical White" and "Laboratory Grey" base, allowing the functional colors to signal state. 
- **Primary Cyan (#00AEEF)** is used exclusively for active states, interactive highlights, and "Safe" telemetry.
- **Alert Amber (#FD9924)** is the critical warning color, reserved for environmental hazards and system failures.
- **Surface Tones** utilize slight shifts in grey (#F5F5F5 to #F9F9F9) to distinguish between navigation and content canvases.
- **Typography** uses a high-contrast near-black for primary data and a muted grey for metadata.

## Typography
The system uses **Inter** for all UI elements to maintain a modern, systematic feel, but applies heavy stylistic overrides.
- **Functional Caps:** Labels and navigation items are set in all-caps with wide letter spacing to mimic industrial signage.
- **Monospaced Telemetry:** A secondary monospace font is used for all live data feeds, system IDs, and technical logs to distinguish "System Output" from "User Interface."
- **High-Impact Numerics:** Environmental readings use large, bold, tight-tracked Inter to ensure visibility from a distance.

## Layout & Spacing
The layout follows a **Fixed-Sidebar Fluid-Canvas** model. 
- **The Sidebar (288px)** is a constant anchor, providing system-wide navigation.
- **The Main Canvas** uses a 12-column bento-grid system for data visualization. 
- **Rhythm:** Spacing is strictly based on a 4px baseline. Large internal margins (48px) create a feeling of "clinical vacuum" or expensive whitespace, preventing the data-heavy interface from feeling cluttered.

## Elevation & Depth
This system rejects traditional shadows in favor of **Structural Outlines**.
- **Flat Depth:** Depth is communicated through 1px solid borders (#E0E0E0 or #BDC8D1).
- **Tonal Layering:** The sidebar is darker than the main canvas, creating a "base" layer.
- **Intervention Layer:** Critical alerts use a solid color fill (Amber) rather than a shadow to "pop" from the layout.
- **Glassmorphism:** A subtle backdrop blur is used on the Top AppBar to maintain context while scrolling without breaking the flat, technical aesthetic.

## Shapes
Shapes are primarily **Geometric and Sharp**. 
- **Standard Radius:** 2px to 4px (Soft) is used for containers and buttons to prevent the UI from feeling aggressive while maintaining a technical edge.
- **Circular Elements:** Reserved strictly for status pips (e.g., "Live" indicators) and specialized gauges to contrast against the rigid rectangular grid.
- **Horizontal Rules:** Frequent use of 1px lines to subdivide content within cards, reinforcing the terminal/document feel.

## Components
- **Buttons:** Rectangular with 2px radius. Primary buttons use a solid dark fill with tracked-out uppercase labels. Secondary buttons use 1px outlines.
- **Bento Cards:** White backgrounds, 1px borders, and internal padding of 16px (stack-md). Each card must have a "Label-Caps" header and a Material Symbol icon for quick scanning.
- **Telemetry Gauges:** Use high-contrast primary colors for data arcs. Background tracks should be low-contrast (Surface Variant).
- **Status Banners:** Full-width or card-width, using the semantic background color (Amber/Red) with a 1px border of a darker shade of the same hue.
- **Inputs:** Minimalist bottom-border only or 1px fully enclosed rectangles with monospace placeholder text.