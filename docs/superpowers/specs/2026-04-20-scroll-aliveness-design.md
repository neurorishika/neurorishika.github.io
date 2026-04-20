# Scroll Aliveness & Section Backgrounds — Design Spec
**Date:** 2026-04-20  
**Project:** neurorishika.github.io

---

## Overview

Two related improvements to make the page feel alive and visually varied:

1. **Scroll/interaction animations** — four targeted effects using physics and scroll-reactivity
2. **Section background palette** — a three-level colour system breaking the single-parchment monotony

---

## Part 1: Scroll & Interaction Effects

### Effect 01 — Hero BrainMap Parallax
**Driver:** `useScrollY()` (already in hooks.jsx)  
**File:** `src/App.jsx`

The BrainMap SVG drifts upward at 0.3× the scroll rate, creating depth relative to the text layer. The hero pitch text counter-drifts at −0.08× (appears closer to the viewer). Both stop contributing once the hero is scrolled past (`scrollY > heroHeight`).

- BrainMap: `transform: translateY(${Math.min(heroHeight, scrollY * 0.3)}px)`
- Hero pitch: `transform: translateY(${-Math.min(heroHeight * 0.2, scrollY * 0.08)}px)`
- Hero already has `translateY(${-parallax}px)` on `hero-left` at `y * 0.08` — this becomes the text counter-drift; the brain gets its own separate faster offset

### Effect 02 — Tool Card 3D Tilt
**Driver:** `onMouseMove` / `onMouseLeave` on each card  
**Files:** `src/Sections.jsx`, `src/styles.css`

Cards tilt on X and Y axes tracking the mouse position relative to card centre. Max ±7°. On mouse leave, CSS transition eases back to flat.

- `perspective: 900px` on `.tools-grid`
- `onMouseMove`: compute `(mouseX - cardCenterX) / cardWidth` → `rotateY` (max 7deg), same for Y → `rotateX` (inverted, max 7deg)
- `onMouseLeave`: clear inline style, CSS `transition: transform 400ms ease-out` handles the spring-back
- `will-change: transform` on `.tool-card` for GPU compositing

### Effect 03 — Marginalia Damped Oscillator
**Driver:** new `useSpring(stiffness, damping)` hook  
**Files:** `src/hooks.jsx`, `src/Sections.jsx`

Each marginalia note hangs from a virtual pin at its top centre. Scroll velocity is injected as an impulse into a spring-damper system; the note oscillates back to rest. Each note uses slightly different stiffness/damping so they settle at different times.

**Physics loop** (runs in `requestAnimationFrame`):
```
every frame:
  dt = 1/60
  a = −stiffness × pos − damping × vel
  vel += a × dt
  pos += vel × dt
  if |pos| < 0.01 and |vel| < 0.01 → stop RAF, pos = 0
```

**Scroll injection** (on `scroll` event):
```
vel += (scrollY − lastScrollY) × 0.4
lastScrollY = scrollY
```

- `transform-origin: top center` on `.marginalia`
- Hook returns `angle` in degrees; applied as `rotateZ(${angle}deg)` combined with the existing `--rot` rotation
- Default stiffness: 80–100 (varied per note via props); damping: 7–10
- RAF only runs while `|pos| > 0.01 || |vel| > 0.01` to avoid idle GPU load

**Hook signature:** `window.useSpring = function useSpring(stiffness = 90, damping = 8)`  
Returns: current `pos` value (degrees of swing)

**Marginalia component change:** Accept `stiffness` and `damping` props; each `Marginalia` use in Sections.jsx gets unique values (e.g., 82/7, 95/9, 88/8, 102/10, 78/8).

### Effect 04 — Section Title Underbar Draw-In
**Driver:** `useInView()` progress (already in hooks.jsx)  
**Files:** `src/Sections.jsx`, `src/styles.css`

The accent rule under each section title currently appears instantly on reveal. Instead it grows from `width: 0` to `width: 44px` driven by scroll progress as the section header enters the viewport.

- Remove `width: 44px` from `.section-title::after` CSS; set `width: 0` as default
- In `Section` component, use `useInView()` on the `section-head` div
- Pass `progress` as inline CSS: `style={{ "--underbar-w": `${Math.min(44, progress * 220)}px` }}`
- CSS: `.section-title::after { width: var(--underbar-w, 0px); transition: none; }`
- Scale factor 220 means the bar is fully drawn by ~20% through the viewport entry

---

## Part 2: Animated Page Background

### Core approach — one global color river

Sections do **not** have their own `background-color`. Instead, a single CSS custom property `--bg-now` on `<html>` holds the current background color. JavaScript updates it every scroll frame by interpolating (lerping) between the "from" and "to" colors of whichever section boundary is currently being crossed. The visual result is a smooth, continuous color transition as you scroll — the page warms into terracotta and then deepens into sienna, all in one unbroken motion.

`.page { background: var(--bg-now, #efe9dd); }` — no `transition` needed since JS updates per frame.

### Color targets per section

| Section | Target colour | Hex |
|---------|--------------|-----|
| Hero | parchment-dark | `#e6dfcf` |
| Now | parchment | `#efe9dd` |
| Research | terracotta | `#f0cdb0` |
| Software | parchment | `#efe9dd` |
| Rigs | terracotta | `#f0cdb0` |
| Publications | parchment | `#efe9dd` |
| Talks | terracotta | `#f0cdb0` |
| Teaching | parchment | `#efe9dd` |
| Path/Timeline | terracotta | `#f0cdb0` |
| Contact | sienna | `#b0532a` |

### Interpolation logic (new `usePageBg` hook in hooks.jsx)

```
On every scroll frame:
  for each adjacent section pair (current, next):
    find scroll midpoints where transition starts/ends
    compute t = clamp((scrollY - transitionStart) / transitionLength, 0, 1)
    color = lerpRGB(currentColor, nextColor, easeInOut(t))
  write color to document.documentElement.style.setProperty("--bg-now", color)
```

Transition zone: the blend starts when the next section is ~30% into the viewport and completes when it fills ~70% of the viewport. This means parchment→terracotta crossfades smoothly over ~40% of each section boundary.

RGB lerp helper: `lerpRGB(a, b, t)` parses hex, interpolates each channel, returns `rgb(r,g,b)`.

### Contact section text inversion

The contact section is the only one where the background goes dark enough to require inverted text. It gets `data-invert="true"` on its `<section>` element, and CSS handles the text color flip:

```css
.section[data-invert] { color: var(--paper); }
.section[data-invert] .section-title,
.section[data-invert] .eyebrow,
.section[data-invert] .section-sub,
.section[data-invert] p,
.section[data-invert] a { color: var(--paper); }
.section[data-invert] .section-title::after { background: var(--paper); opacity: 0.6; }
.section[data-invert] .marginalia { background: rgba(239,233,221,0.12); color: var(--paper); border-color: rgba(239,233,221,0.2); }
```

The inversion is not animated — Contact section only. All other sections use dark ink on whatever background is behind them (all intermediate colors A and B remain light enough for dark ink).

### Grain overlay

The existing `.page::before` grain overlay sits above the background via `z-index: 9999` and `mix-blend-mode: multiply` — it naturally works on all background colors without change.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/hooks.jsx` | Add `useSpring(stiffness, damping)` hook; add `usePageBg(sectionColors)` hook |
| `src/App.jsx` | Effect 01: BrainMap + text parallax; mount `usePageBg` with section color map |
| `src/Sections.jsx` | Effect 02: card tilt handlers; Effect 03: Marginalia spring props + stiffness/damping variety; Effect 04: underbar progress; Contact section gets `data-invert` |
| `src/styles.css` | Effect 02: `.tools-grid` perspective, card `will-change`; Effect 04: underbar CSS var; `--bg-now` background on `.page`; `[data-invert]` text overrides; remove any static section backgrounds |

---

## Implementation Order

1. **Effect 04 underbar draw-in** — CSS var change + small Section component tweak; immediately visible
2. **Part 2 animated background** — `usePageBg` hook + mount in App.jsx + `[data-invert]` CSS for Contact
3. **Effect 01 hero parallax** — extend existing scroll logic in App.jsx
4. **Effect 03 marginalia spring** — `useSpring` hook + Marginalia component wiring
5. **Effect 02 card tilt** — mouse-event handlers on tool cards; test on real device last
