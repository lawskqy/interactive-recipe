import type { ReactNode } from "react";
import { useCutoutLayout } from "../lib/cutout-layout";

export interface VesselAnchor { x: number; y: number; width: number; radiusY: number }

// Align the opening, not the surrounding image rectangle. Image margins and
// bowl height must never move the landing point of the powder.
export default function ActionVessel({ src, anchor, fallback, result = false, opacity = 1, onError, id }: {
  src?: string; anchor: VesselAnchor; fallback?: ReactNode;
  result?: boolean; opacity?: number; onError?: () => void;
  id?: string;
}) {
  const layout = useCutoutLayout(src);
  if (!src) return fallback;
  if (!layout && !result) return fallback;
  const scale = layout ? anchor.width / layout.opening.width : 0;
  const x = layout ? anchor.x - layout.opening.x * scale : anchor.x;
  const y = layout ? anchor.y - layout.opening.y * scale : anchor.y;
  return <image id={id} className={result ? "generated-result" : "vessel-cutout"}
    href={src} x={x} y={y} width={layout ? layout.width * scale : 1} height={layout ? layout.height * scale : 1}
    style={{ opacity: layout ? opacity : 0 }} onError={onError}
    data-opening-x={anchor.x} data-opening-y={anchor.y} data-opening-width={anchor.width} />;
}
