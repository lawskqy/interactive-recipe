import type { ReactNode } from "react";
import ActionVessel from "../ActionVessel";
import type { SceneProps } from "./types";

export function Burner({ flame = 1 }: { flame?: number }) {
  return <g>
    <rect x="112" y="276" width="136" height="10" rx="4" fill="#3d322b" />
    <g className="burner-flame" opacity="0.9" style={{ transformOrigin: "180px 276px" }}>
      {[132, 156, 180, 204, 228].map(x => <path key={x}
        d={`M${x - 6} 276Q${x - 7} ${276 - 12 * flame} ${x} ${276 - 20 * flame}Q${x + 7} ${276 - 12 * flame} ${x + 6} 276Z`}
        fill="#e9a04b" stroke="#f2c46d" strokeWidth="1" />)}
    </g>
  </g>;
}

export function PanBack({ receiver, anchor, resultProgress, liquid, children }: SceneProps & { liquid: string; children?: ReactNode }) {
  return <g className="receiver-content" style={{ opacity: 1 - resultProgress }}>
    <ActionVessel src={receiver} anchor={anchor} fallback={<>
      <path d="M265 190H338" stroke="#5c4a3d" strokeWidth="12" strokeLinecap="round" />
      <path d="M95 180L104 246Q180 262 256 246L265 180Z" fill="#b9b1a6" stroke="#8d847a" strokeWidth="2" />
      <ellipse cx="180" cy="180" rx="85" ry="17" fill="#d6cfc4" stroke="#8d847a" strokeWidth="2" />
      <ellipse className="pan-liquid" cx="180" cy="184" rx="74" ry="12" fill={liquid} />
      {children}
    </>} />
  </g>;
}
