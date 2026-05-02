# Tool Preview Animations Redesign

**Date:** 2026-04-20  
**Scope:** Three animations in `src/ToolPreviews.jsx` — ArthroScape (`MapPreview`), D. Manager (`StockPreview`), MiniVentory (`InventoryPreview`)

---

## Approach

Thin-stroke minimalism — consistent with the existing preview aesthetic (100×70 SVG viewport, monospace labels, low-opacity fills, accent color throughout). No new dependencies.

---

## ArthroScape — `MapPreview` replacement

**Concept:** Odor plume flowing left→right with flies performing casting behavior.

**Visual elements:**
- Plume: 3–4 nested semi-transparent ellipses widening rightward from the left edge, giving a cone/wedge silhouette. Static shape, no particles.
- Flies: 3 small ellipses (matching CLOPSPreview fly style — `rx=2.1 ry=1.15`), each with a heading and internal plume-detection state.

**Fly behavior (per fly):**
- Each fly tracks an x position moving rightward across the SVG.
- Plume cone: centerline y=35, half-width = `4 + fly.x * 0.22` (widens left→right). A fly is **on-plume** when `|fly.y - 35| < half-width at fly.x`.
- **Surging** (on-plume): moves with reduced lateral oscillation, heading toward the plume centerline.
- **Casting** (off-plume): sweeps with a growing-amplitude sine arc, scanning for the plume edge.
- Flies have staggered phase offsets so they're in different states simultaneously.
- Short polyline trail (6–8 points) behind each fly.

**Status text:**
- Top-left: `ArthroScape · odor tracking`
- Bottom: `τ={t.toFixed(1)}s · casting · n=3`

---

## D. Manager — `StockPreview` replacement

**Concept:** Sequential three-phase loop showing the fly vial management workflow.

**Phase timing:** Each phase ~2.5s; total cycle ~7.5s, loops continuously.

**Phase 1 — Flip (~0–2.5s):**
- Two thin rectangles (vials) side by side, centered in the SVG.
- Small dots (fly fill-opacity dots) inside the left vial.
- Left vial tips/rotates slightly (CSS/SVG transform rotate ~15°) as dots animate sliding into the right vial.
- Phase label: `flip · transferring`

**Phase 2 — Label (~2.5–5s):**
- Both vials static. A small 4×4 dot-grid (QR code approximation) fades in on the right vial's cap area.
- Dots appear one row at a time over ~1s.
- Phase label: `label · QR stamp`

**Phase 3 — Scan (~5–7.5s):**
- Thin horizontal line sweeps slowly downward across the QR grid over ~1s.
- After sweep completes, a small `✓` character fades in beside the vial.
- Phase label: `scan · verified`

**Status text:**
- Top-left: `D. Manager · vial workflow`
- Bottom: phase label (changes each phase)

---

## MiniVentory — `InventoryPreview` replacement

**Concept:** Two-panel checkout/return form with typewriter field-fill animation.

**Layout (within 100×70 SVG):**
- Left panel (x: 2–48): header `Check out`, 4 field rows below
- Right panel (x: 52–98): header `Return`, 4 field rows below
- Thin vertical divider line at x=50

**Field rows (per panel):**
- `person` / `item` / `qty` / `reason`
- Each row: small monospace label + thin underline (the "input" line)
- Active field gets a blinking cursor rect

**Animation cycle (~10s loop, `cycleLen=10`):**
1. t=0–4s: Checkout panel — cursor moves through fields 1→4, each field value typewriters in (1s per field; `charRate = chars / 1.0`)
2. t=4–4.3s: Submit flash (panel rect brightens briefly)
3. t=4.3–8.3s: Return panel — same sequence
4. t=8.3–8.6s: Submit flash, then values fade out and cycle resets at t=10s

**Values used (hardcoded, cycling):**
- person: `R.M.` / `C.U.`
- item: `fly food` / `pipette tips`
- qty: `2` / `1`
- reason: (blank / `leftover`)

**Status text:**
- Bottom: `checkout · 3 items · 1 pending return`

---

## Implementation notes

- All three replace existing named components in `src/ToolPreviews.jsx`; the `PREVIEWS` map keys stay the same (`map`, `stock`, `inventory`).
- Use the existing `useAnim` hook (shared rAF ticker) for all timing.
- Phase switching in D. Manager uses `Math.floor(t / 2.5) % 3`.
- Typewriter in MiniVentory uses `Math.floor((t % cycleLen) / charRate)` to index into each field string.
- No new CSS classes needed; reuse `tp-svg` and `var(--mono)` / `var(--accent)` / `currentColor`.
