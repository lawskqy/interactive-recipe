import ActionCutout from "../ActionCutout";
import { useCutoutLayout } from "../../lib/cutout-layout";
import { SPOON } from "./types";

export default function SpoonArt({ src }: { src?: string }) {
  const layout = useCutoutLayout(src);
  const { bowl, length, thickness } = SPOON;
  const right = bowl.x + 14;
  const box = { x: right - length, y: bowl.y - thickness / 2, width: length, height: thickness };
  const fallback = <>
    <path d={`M${box.x + 4} ${bowl.y - 3}L${bowl.x - 14} ${bowl.y}`} stroke="#c5a16a" strokeWidth="5" strokeLinecap="round" />
    <ellipse cx={bowl.x} cy={bowl.y + 1} rx="15" ry="7" fill="#d8bd8a" stroke="#b89a70" strokeWidth="2" />
  </>;
  if (!src || !layout) return fallback;
  const upright = layout.bottom - layout.top > layout.right - layout.left;
  if (upright) {
    const cx = box.x + length / 2;
    return <g transform={`rotate(${layout.handleDown ? 90 : -90} ${cx} ${bowl.y})`}>
      <ActionCutout src={src} x={cx - thickness / 2} y={bowl.y - length / 2} width={thickness} height={length} />
    </g>;
  }
  return <g transform={layout.heavyEnd === "left" ? `matrix(-1 0 0 1 ${2 * box.x + length} 0)` : undefined}>
    <ActionCutout src={src} {...box} />
  </g>;
}
