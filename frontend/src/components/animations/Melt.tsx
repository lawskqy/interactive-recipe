import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { StirringSpoon } from "./Spoon";
import { CUP, type ActionAnimation } from "./types";

const pieces = [[180, 186, 10], [204, 182, -14], [228, 188, 20], [194, 198, -6], [218, 200, 12], [170, 200, 30]];

const melt: ActionAnimation = {
  caption: "Stir gently until melted",
  anchor: CUP,
  container: /cup|mug|glass|saucepan|pan|bowl/i,
  implement: /spoon|spatula/i,
  motion(tl) {
    tl.add(".melt-spoon", { y: [-40, 0], opacity: [0, 1], duration: 600 }, 300);
    for (let i = 0; i < 6; i++) {
      tl.add(".melt-spoon", { x: [-10, 10, -10], rotate: [-4, 4, -4], duration: 520 }, 900 + i * 520);
    }
    tl.add(".melt-piece", { scale: [1, 0.15], opacity: [1, 0], rotate: [0, 30], delay: stagger(220), duration: 2200 }, 900);
    tl.add(".melt-swirl", { opacity: [0, 0.85, 0.5], scaleX: [0.4, 1], duration: 2600 }, 1200);
    tl.add(".melt-spoon", { y: -40, opacity: 0, duration: 600 }, 4100);
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={resultColor}>
        <path className="melt-swirl" d="M166 190Q190 178 214 188T246 186" fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" opacity="0" style={{ transformOrigin: "205px 188px" }} />
        {pieces.map(([x, y, angle], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}>
          <rect className="melt-piece" x="-7" y="-6" width="14" height="12" rx="2" fill={color} stroke="#00000022"
            style={{ transformBox: "fill-box", transformOrigin: "center" }} />
        </g>)}
      </CupBack>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <StirringSpoon src={implement} className="melt-spoon" />
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default melt;
