import type { ReactNode } from "react";
import { useCutoutLayout } from "../lib/cutout-layout";

// Fit the visible pixels, not the often generous margins around generated art.
export default function ActionCutout({ src, x, y, width, height, fallback, tool = false }: {
  src?: string; x: number; y: number; width: number; height: number;
  fallback?: ReactNode; tool?: boolean;
}) {
  const layout = useCutoutLayout(src);
  if (!src || !layout) return fallback;
  return <svg x={x} y={y} width={width} height={height}
    viewBox={`${layout.left} ${layout.top} ${layout.right - layout.left} ${layout.bottom - layout.top}`}
    preserveAspectRatio="xMidYMid meet" overflow="visible"
    transform={tool && layout.handleDown ? `rotate(180 ${x + width / 2} ${y + height / 2})` : undefined}>
    <image data-cutout="true" href={src} x="0" y="0" width={layout.width} height={layout.height} />
  </svg>;
}
