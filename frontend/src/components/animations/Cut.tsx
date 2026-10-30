import ActionCutout from "../ActionCutout";
import ActionVessel from "../ActionVessel";
import type { ActionAnimation } from "./types";

const strips = [0, 1, 2, 3, 4];
const edge = (i: number) => 162 + (i + 1) * 11.2;

const cut: ActionAnimation = {
  caption: "Cut into pieces",
  anchor: { x: 190, y: 206, width: 200, radiusY: 10 },
  container: /board|plate/i,
  implement: /knife|peeler/i,
  motion(tl) {
    tl.add(".cut-knife", { x: [edge(0) + 60, edge(0)], y: -24, opacity: [0, 1], duration: 600 }, 0);
    for (let i = 0; i < 4; i++) {
      const at = 700 + i * 760;
      tl.add(".cut-knife", { x: edge(i), y: [-24, 22], duration: 260, ease: "inQuad" }, at);
      for (let j = 0; j <= i; j++) tl.add(`.cut-strip-${j}`, { x: -(i + 1 - j) * 4, rotate: -(i + 1 - j) * 2, duration: 220 }, at + 260);
      tl.add(".cut-knife", { y: -24, x: edge(i + 1), duration: 420 }, at + 320);
    }
    tl.add(".cut-knife", { x: 320, opacity: 0, duration: 500 }, 3900);
  },
  Scene({ clip, anchor, color, receiver, implement, resultImage, resultProgress }) {
    return <>
      <defs><clipPath id={`${clip}-fruit`}><circle cx="190" cy="186" r="28" /></clipPath></defs>
      <g className="receiver-content" style={{ opacity: 1 - resultProgress }}>
        <ActionVessel src={receiver} anchor={anchor} fallback={<>
          <path d="M88 206H292L300 228H80Z" fill="#a8824f" />
          <path d="M80 228H300V236Q190 242 80 236Z" fill="#8a6a3f" />
          <path d="M96 212H284" stroke="#c49c63" strokeWidth="2" opacity="0.6" />
        </>} />
        {strips.map(i => <g key={i} className={`cut-strip-${i}`} style={{ transformOrigin: `${162 + i * 11.2 + 5.6}px 214px` }}>
          <rect x={162 + i * 11.2} y="156" width="11.4" height="60" fill={color} clipPath={`url(#${clip}-fruit)`} />
          {i > 0 && <path d={`M${162 + i * 11.2} 160V212`} stroke="#fff7e2" strokeWidth="1" opacity="0.5" />}
        </g>)}
        <path d="M172 168Q182 160 196 162" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
      </g>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="cut-knife" opacity="0">
          <ActionCutout src={implement} x={-4} y={70} width={90} height={120} tool fallback={<>
            <path d="M0 190V128Q8 116 14 112V190Z" fill="#d9d6d0" stroke="#9e9a93" strokeWidth="1.5" />
            <path d="M8 112L44 74" stroke="#3d322b" strokeWidth="10" strokeLinecap="round" />
          </>} />
        </g>
      </g>
    </>;
  },
};
export default cut;
