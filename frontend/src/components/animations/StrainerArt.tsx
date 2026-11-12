import ActionCutout from "../ActionCutout";
import { useCutoutLayout } from "../../lib/cutout-layout";
import { STRAINER, type Anchor } from "./types";

const { half: HALF, depth: DEPTH } = STRAINER;
const HANDLE = 64;
const SOLIDS = [[-8, 30], [-2, 34], [5, 31], [0, 27], [-5, 36], [9, 26]];

export default function StrainerArt({ src, anchor, clip, color }: { src?: string; anchor: Anchor; clip: string; color: string }) {
  const layout = useCutoutLayout(src);
  const top = anchor.y - STRAINER.lift;
  const cone = `M${anchor.x - HALF} ${top}L${anchor.x - 5} ${top + DEPTH}Q${anchor.x} ${top + DEPTH + 4} ${anchor.x + 5} ${top + DEPTH}L${anchor.x + HALF} ${top}Z`;
  if (src && layout && (layout.right - layout.left) >= (layout.bottom - layout.top) * 1.6) {
    const x = anchor.x - HALF - 8, width = HALF * 2 + HANDLE + 8;
    const flip = layout.heavyEnd === "right";
    return <g transform={flip ? `matrix(-1 0 0 1 ${2 * x + width} 0)` : undefined}>
      <ActionCutout src={src} x={x} y={top - 14} width={width} height={DEPTH + 22} />
    </g>;
  }
  return <>
    <defs><clipPath id={`${clip}-strainer`}><path d={cone} /></clipPath></defs>
    <path d={`M${anchor.x + HALF - 2} ${top - 1}Q${anchor.x + HALF + HANDLE * 0.5} ${top - 6} ${anchor.x + HALF + HANDLE} ${top - 13}`}
      fill="none" stroke="#8f7a56" strokeWidth="5.5" strokeLinecap="round" />
    <path d={`M${anchor.x + HALF - 2} ${top - 2}Q${anchor.x + HALF + HANDLE * 0.5} ${top - 7} ${anchor.x + HALF + HANDLE} ${top - 14}`}
      fill="none" stroke="#d8c7a2" strokeWidth="1.6" strokeLinecap="round" />
    <path d={`M${anchor.x - HALF + 2} ${top}L${anchor.x - HALF - 13} ${top - 4}`} stroke="#8f7a56" strokeWidth="4" strokeLinecap="round" />
    <g clipPath={`url(#${clip}-strainer)`}>
      <path d={cone} fill="#e7dcc3" fillOpacity="0.28" />
      <rect className="strainer-fill" x={anchor.x - HALF} y={top} width={HALF * 2} height={DEPTH + 6} fill={color} opacity="0.85"
        transform={`translate(0 ${DEPTH + 6})`} />
      {SOLIDS.map(([dx, dy], i) => <circle key={i} className="strain-solid" cx={anchor.x + dx} cy={top + dy}
        r={i % 3 ? 2.4 : 3.2} fill={color} stroke="#00000055" strokeWidth="0.8" opacity="0"
        style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}
      {Array.from({ length: 15 }, (_, i) => <path key={i} d={`M${anchor.x - HALF - 40 + i * 9} ${top}l40 ${DEPTH + 4}`}
        stroke="#a7936c" strokeWidth="0.7" opacity="0.8" />)}
      {Array.from({ length: 15 }, (_, i) => <path key={`b${i}`} d={`M${anchor.x - HALF + i * 9} ${top}l-40 ${DEPTH + 4}`}
        stroke="#a7936c" strokeWidth="0.7" opacity="0.8" />)}
    </g>
    <path d={cone} fill="none" stroke="#9b8660" strokeWidth="1.4" />
    <ellipse cx={anchor.x} cy={top} rx={HALF} ry="3.5" fill="none" stroke="#c9b48c" strokeWidth="3" />
    <ellipse cx={anchor.x} cy={top} rx={HALF} ry="3.5" fill="none" stroke="#7d6a4a" strokeWidth="0.8" />
  </>;
}
