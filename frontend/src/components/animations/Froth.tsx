import { stagger } from "animejs";
import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const froth: ActionAnimation = {
  caption: "Froth until light and foamy",
  anchor: CUP,
  container: /jug|pitcher|cup|mug|glass/i,
  implement: /frother|steam wand/i,
  motion(tl) {
    tl.add(".frother-motion", { y: [-40, 0], opacity: [0, 1], duration: 500 }, 0);
    for (let i = 0; i < 26; i++) {
      tl.add(".frother-motion", { x: [-1.5, 1.5, -1.5], duration: 120 }, 550 + i * 120);
    }
    for (let i = 0; i < 26; i++) {
      tl.add(".frother-coil", { scaleX: [1, 0.25, 1], duration: 120 }, 550 + i * 120);
    }
    tl.add(".cup-liquid", { y: [0, -12], duration: 2800 }, 800);
    tl.add(".froth-foam", { scaleY: [0.05, 1], opacity: [0, 1], duration: 2800 }, 800);
    tl.add(".froth-bubble", { opacity: [0, 0.9], scale: [0.3, 1], delay: stagger(140), duration: 500 }, 1200);
    tl.add(".frother-motion", { y: -40, opacity: 0, duration: 600 }, 4000);
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={color}>
        <g className="froth-foam" opacity="0">
          <path d="M152 186Q166 172 180 182Q194 170 208 181Q222 170 236 182Q250 172 262 184V208H152Z" fill={resultColor} />
          {[166, 184, 202, 220, 238, 194, 228].map((cx, i) =>
            <circle key={i} className="froth-bubble" cx={cx} cy={i < 5 ? 186 : 178} r={2 + i % 3} fill="#fffaf0" opacity="0" />)}
        </g>
      </CupBack>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="frother-motion">
          <ActionCutout src={implement} x={186} y={36} width={40} height={180} tool fallback={<>
            <rect x="198" y="38" width="16" height="66" rx="7" fill="#5c4a3d" stroke="#3f3129" strokeWidth="2" />
            <circle cx="206" cy="58" r="3" fill="#d9c8aa" />
            <path d="M206 104V196" stroke="#b8b0a4" strokeWidth="3" strokeLinecap="round" />
            <ellipse className="frother-coil" cx="206" cy="200" rx="10" ry="5" fill="none" stroke="#9e958a" strokeWidth="2.5" />
          </>} />
        </g>
      </g>
      <CupFront {...props} />
    </>;
  },
};
export default froth;
