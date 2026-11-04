import type { CutoutLayout } from "./cutout-layout";

// Every step shows its vessel at one size, standing on one table line, so the
// same glass or bowl looks identical from step to step and animation to animation.
export const STAGE = { width: 360, height: 320, table: 270, size: 136 };

export function standardScale(layout: CutoutLayout) {
  return STAGE.size / Math.max(layout.right - layout.left, layout.bottom - layout.top);
}

// The viewBox that shows a vessel drawn at `anchor` at its standard size and place.
export function stageFrame(layout: CutoutLayout, anchor: { x: number; y: number; width: number }) {
  const scale = anchor.width / layout.opening.width;
  const zoom = Math.min(3, Math.max(0.25, standardScale(layout) / scale));
  const base = anchor.y + (layout.bottom - layout.opening.y) * scale;
  return { x: anchor.x - STAGE.width / 2 / zoom, y: base - STAGE.table / zoom,
    width: STAGE.width / zoom, height: STAGE.height / zoom };
}
