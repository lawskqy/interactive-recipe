import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import SpoonArt from "./SpoonArt";
import { CUP, SPOON, type ActionAnimation } from "./types";

const { bowl } = SPOON;
const GRAINS = 14;
const TURN = -8;
const PROFILE = 0.38;

const spoonIn: ActionAnimation = {
  caption: "Add a spoonful",
  anchor: CUP,
  container: /cup|mug|glass|bowl|saucepan|blender|jug/i,
  implement: /spoon|scoop/i,
  motion(tl) {
    tl.add(".spoonful", { x: [-90, 0], y: [10, 0], opacity: [0, 1], duration: 800, ease: "outCubic" }, 0);
    tl.add(".spoonful-tip", { rotate: [0, 40], duration: 650, ease: "inOutQuad" }, 1000);
    tl.add(".spoonful-pile", { x: [0, 7], y: [0, 5], scale: [1, 0], duration: 1000, ease: "inQuad" }, 1250);
    for (let wave = 0; wave < 3; wave++) {
      tl.add(".spoonful-grain", { x: [0, 3], y: [0, 70], opacity: [0, 1, 1, 0], delay: stagger(28), duration: 600, ease: "inQuad" },
        1300 + wave * 330);
    }
    tl.add(".spoonful-ring", { scale: [0.3, 1.3], opacity: [0, 0.7, 0], delay: stagger(350), duration: 900 }, 1750);
    tl.add(".spoonful-tip", { rotate: [40, 46, 40], duration: 260 }, 2500);
    tl.add(".spoonful-tip", { rotate: 0, duration: 500, ease: "inOutSine" }, 2900);
    tl.add(".spoonful", { x: 90, y: -10, opacity: 0, duration: 700, ease: "inCubic" }, 3400);
  },
  Scene(props) {
    const { anchor, color, resultColor, implement, resultImage, resultProgress } = props;
    const lip = { x: bowl.x + 12, y: bowl.y + 4 };
    return <>
      <CupBack {...props} liquid={resultColor}>
        {[0, 1].map(i => <ellipse key={i} className="spoonful-ring" cx={anchor.x + 4} cy={anchor.y + 20} rx="20" ry="4" fill="none"
          stroke="#fff7e2" strokeWidth="1.5" opacity="0" style={{ transformOrigin: `${anchor.x + 4}px ${anchor.y + 20}px` }} />)}
      </CupBack>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="spoonful">
          <g className="spoonful-tip" style={{ transformOrigin: `${bowl.x}px ${bowl.y}px` }}>
            <g transform={`rotate(${TURN} ${bowl.x} ${bowl.y}) translate(${bowl.x} ${bowl.y}) scale(1 ${PROFILE}) translate(${-bowl.x} ${-bowl.y})`}>
              <SpoonArt src={implement} />
            </g>
            <g className="spoonful-pile" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}>
              <path d={`M${bowl.x - 12} ${bowl.y - 1}Q${bowl.x - 8} ${bowl.y - 11} ${bowl.x} ${bowl.y - 12}Q${bowl.x + 8} ${bowl.y - 11} ${bowl.x + 12} ${bowl.y - 1}Z`}
                fill={color} stroke="#00000033" strokeWidth="0.8" />
              {[[-6, -3], [-1, -7], [4, -4], [8, -1], [-9, 0]].map(([dx, dy], i) => <circle key={i} cx={bowl.x + dx} cy={bowl.y + dy}
                r="0.9" fill="#ffffff" opacity="0.35" />)}
            </g>
          </g>
        </g>
        {Array.from({ length: GRAINS }, (_, i) => <circle key={i} className="spoonful-grain" cx={lip.x + i % 4 * 3 - 4} cy={lip.y + i % 3 * 2}
          r={1.3 + i % 2 * 0.6} fill={color} opacity="0" />)}
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default spoonIn;
