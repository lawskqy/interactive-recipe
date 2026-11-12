import ActionCutout from "../ActionCutout";
import { spoonTip } from "./reach";
import type { SceneProps } from "./types";

export function StirringSpoon({ scene, src, className, travel = 0 }: {
  scene: SceneProps; src?: string; className: string; travel?: number;
}) {
  const tip = spoonTip(scene, travel);
  const { x, width } = scene.anchor;
  const length = Math.min(170, width * 1.5);
  return <g className={className} style={{ transformOrigin: `${x + 2}px ${scene.anchor.y}px` }}>
    <ActionCutout src={src} x={x - 26} y={tip - length} width={56} height={length} tool tipDown fallback={
      <g transform={`translate(${x - 205} ${tip - 218})`}>
        <path d="M226 52L208 196" stroke="#c5a16a" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="206" cy="204" rx="9" ry="14" transform="rotate(8 206 204)" fill="#d8bd8a" stroke="#b89a70" strokeWidth="2" />
      </g>} />
  </g>;
}
