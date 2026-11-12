import ActionVessel from "../ActionVessel";
import type { SceneProps } from "./types";

export function BowlBack({ receiver, anchor, resultProgress, contents }: SceneProps & { contents: string }) {
  return <g className="receiver-content" style={{ opacity: 1 - resultProgress }}>
    <ActionVessel src={receiver} anchor={anchor} fallback={<>
      <path d="M89 193Q98 255 180 255Q262 255 271 193Z" fill="#ddd0b6" stroke="#b89a70" strokeWidth="2" />
      <ellipse cx="180" cy="193" rx="91" ry="25" fill="#f5edda" stroke="#b89a70" strokeWidth="2" />
      <ellipse cx="180" cy="194" rx="75" ry="17" fill={contents} />
    </>} />
  </g>;
}

export function BowlFront({ clip, receiver, anchor, resultProgress, result }: SceneProps) {
  return <g className="vessel-front" clipPath={`url(#${clip}-front)`}>
    <g style={{ opacity: 1 - resultProgress }}>
      <ActionVessel src={receiver} anchor={anchor} fallback={<>
        <path d="M89 193Q95 215 180 218Q265 215 271 193Q262 255 180 255Q98 255 89 193Z"
          fill="#ddd0b6" stroke="#b89a70" strokeWidth="2" />
        <path d="M115 224Q180 250 245 224" fill="none" stroke="#f7efdd" strokeWidth="3" opacity="0.6" />
      </>} />
    </g>
    {result && <use href={`#${clip}-result`} />}
  </g>;
}
