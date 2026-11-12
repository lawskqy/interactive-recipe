import ActionCutout from "../ActionCutout";
import { useCutoutLayout } from "../../lib/cutout-layout";
import { POUR_LIP } from "./types";

const BOX = { x: 70, y: 49, width: 102, height: 90 };

export default function PourPitcher({ source, color }: { source?: string; color: string }) {
  const layout = useCutoutLayout(source);
  let flip = false, origin = POUR_LIP;
  if (source && layout) {
    // Pour from the side away from the handle, mirroring the art when it faces the vessel.
    flip = layout.handleSide === "right";
    const width = layout.right - layout.left, height = layout.bottom - layout.top;
    const scale = Math.min(BOX.width / width, BOX.height / height);
    const lip = flip ? layout.lips.left : layout.lips.right;
    const x = BOX.x + (BOX.width - width * scale) / 2 + (lip.x - layout.left) * scale;
    origin = { x: flip ? 2 * BOX.x + BOX.width - x : x, y: BOX.y + (BOX.height - height * scale) / 2 + (lip.y - layout.top) * scale };
  }
  return <g transform={`translate(${POUR_LIP.x - origin.x} ${POUR_LIP.y - origin.y})`}>
    <g className="pitcher-enter">
      <g className="pitcher-motion" style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}>
        <g transform={flip ? `matrix(-1 0 0 1 ${2 * BOX.x + BOX.width} 0)` : undefined}>
          <ActionCutout src={source} {...BOX} fallback={<>
            <path d="M89 68Q53 58 58 95Q59 112 85 112" fill="none" stroke="#b9aa8e" strokeWidth="7" />
            <path d="M87 49H154L172 76L151 72L145 127Q115 139 86 125Z" fill="#e9ddc4" stroke="#b59b73" strokeWidth="2" />
            <path d="M96 80H146L140 122Q116 130 95 120Z" fill={color} />
            <path d="M99 57V73" stroke="#fff8e6" strokeWidth="4" strokeLinecap="round" />
          </>} />
        </g>
      </g>
    </g>
  </g>;
}
