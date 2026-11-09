import { useId, type ReactNode } from "react";
import { useCutoutLayout, widthAt } from "../lib/cutout-layout";

export interface VesselAnchor { x: number; y: number; width: number; radiusY: number }

// Align the opening, not the surrounding image rectangle. Image margins and
// bowl height must never move the landing point of the powder.
export default function ActionVessel({ src, anchor, fallback, result = false, opacity = 1, onError, id, match, closed = false }: {
  src?: string; anchor: VesselAnchor; fallback?: ReactNode;
  result?: boolean; opacity?: number; onError?: () => void;
  id?: string; match?: string;
  // Keep a lid on, e.g. a blender running.
  closed?: boolean;
}) {
  const lidClip = useId().replace(/:/g, "");
  const layout = useCutoutLayout(src);
  const target = useCutoutLayout(match);
  if (!src) return fallback;
  if (!layout && !result) return fallback;
  let scale = layout ? anchor.width / layout.opening.width : 0;
  let x = layout ? anchor.x - layout.opening.x * scale : anchor.x;
  let y = layout ? anchor.y - layout.opening.y * scale : anchor.y;
  // A result drawn in the animated vessel takes that vessel's size and place,
  // matched by body width, since its own rim may be widened by foam or ice.
  if (layout && target) {
    const vessel = anchor.width / target.opening.width;
    const vesselTop = anchor.y - target.opening.y * vessel;
    scale = target.body.width * vessel / layout.body.width;
    x = anchor.x + (target.body.x - target.opening.x) * vessel - layout.body.x * scale;
    y = vesselTop + target.body.y * vessel - layout.body.y * scale;
    // Settle the height by matching outlines over the lower body, below any foam or ice.
    const from = vesselTop + target.body.top * vessel, to = vesselTop + target.bottom * vessel;
    let best = y, bestError = Infinity;
    for (let shift = -24; shift <= 24; shift += 0.5) {
      let error = 0;
      for (let k = 0; k <= 48; k++) {
        const sceneY = from + (to - from) * k / 48;
        error += Math.abs(widthAt(target, (sceneY - vesselTop) / vessel) * vessel - widthAt(layout, (sceneY - y - shift) / scale) * scale);
      }
      if (error < bestError) { bestError = error; best = y + shift; }
    }
    y = best;
  }
  const waiting = !!match && target === undefined;
  const image = <image id={id} className={result ? "generated-result" : "vessel-cutout"}
    href={src} x={x} y={y} width={layout ? layout.width * scale : 1} height={layout ? layout.height * scale : 1}
    style={{ opacity: layout && !waiting ? opacity : 0 }} onError={onError}
    data-opening-x={anchor.x} data-opening-y={anchor.y} data-opening-width={anchor.width} />;
  if (result || closed || !layout?.lid) return image;
  // Things go into this vessel, so lift its lid off at the rim and show the open mouth.
  const radiusY = layout.opening.radiusY * scale;
  return <g>
    <defs><clipPath id={`${lidClip}-open`}>
      <rect x={x} y={anchor.y} width={layout.width * scale} height={layout.height * scale} />
      <ellipse cx={anchor.x} cy={anchor.y} rx={anchor.width / 2} ry={radiusY} />
    </clipPath></defs>
    <g clipPath={`url(#${lidClip}-open)`}>{image}</g>
    <ellipse className="vessel-mouth" cx={anchor.x} cy={anchor.y} rx={anchor.width / 2 - 1} ry={radiusY - 1}
      opacity={opacity} fill="#2c241e" fillOpacity="0.55" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
  </g>;
}
