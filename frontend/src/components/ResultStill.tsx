import ActionVessel from "./ActionVessel";
import { useCutoutLayout } from "../lib/cutout-layout";
import { STAGE, standardScale } from "../lib/stage-frame";

// A result without an animation, drawn in its vessel at the same standard size
// and place the animated steps use.
export default function ResultStill({ vessel, result, opacity, label, onError }: {
  vessel: string; result: string; opacity: number; label: string; onError: () => void;
}) {
  const layout = useCutoutLayout(vessel);
  const scale = layout ? standardScale(layout) : 0;
  const anchor = layout ? { x: STAGE.width / 2, y: STAGE.table - (layout.bottom - layout.opening.y) * scale,
    width: layout.opening.width * scale, radiusY: layout.opening.radiusY * scale } : { x: 0, y: 0, width: 1, radiusY: 1 };
  return <svg className="result-still" viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} role="img" aria-label={label}>
    {layout && <ActionVessel src={result} anchor={anchor} match={vessel} result opacity={opacity} onError={onError} />}
  </svg>;
}
