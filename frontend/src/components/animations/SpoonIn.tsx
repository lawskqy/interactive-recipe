import { stagger } from "animejs";
import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const spoonIn: ActionAnimation = {
  caption: "Add a spoonful",
  anchor: CUP,
  container: /cup|mug|glass|bowl|saucepan|blender|jug/i,
  implement: /spoon|scoop/i,
  motion(tl) {
    tl.add(".spoonful", { x: [-90, 0], opacity: [0, 1], duration: 800 }, 0);
    tl.add(".spoonful", { rotate: [0, 48], duration: 700 }, 1000);
    tl.add(".spoonful-pile", { scale: [1, 0], duration: 900 }, 1200);
    for (let wave = 0; wave < 3; wave++) {
      tl.add(".spoonful-grain", { y: [0, 66], opacity: [0, 1, 0], delay: stagger(30), duration: 550, ease: "inQuad" }, 1200 + wave * 380);
    }
    tl.add(".spoonful-ring", { scale: [0.3, 1.3], opacity: [0, 0.7, 0], delay: stagger(350), duration: 900 }, 1700);
    tl.add(".spoonful", { rotate: 0, x: 90, opacity: 0, duration: 800 }, 3300);
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={resultColor}>
        {[0, 1].map(i => <ellipse key={i} className="spoonful-ring" cx="210" cy="186" rx="20" ry="4" fill="none"
          stroke="#fff7e2" strokeWidth="1.5" opacity="0" style={{ transformOrigin: "210px 186px" }} />)}
      </CupBack>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="spoonful" style={{ transformOrigin: "200px 120px" }}>
          <ActionCutout src={implement} x={100} y={100} width={120} height={36} fallback={<>
            <path d="M104 116L188 120" stroke="#c5a16a" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="204" cy="121" rx="17" ry="8" fill="#d8bd8a" stroke="#b89a70" strokeWidth="2" />
          </>} />
          <ellipse className="spoonful-pile" cx="204" cy="116" rx="13" ry="6" fill={color}
            style={{ transformBox: "fill-box", transformOrigin: "center bottom" }} />
        </g>
        {Array.from({ length: 12 }, (_, i) => <circle key={i} className="spoonful-grain" cx={206 + i % 4 * 4} cy={124 + i % 3 * 2}
          r={1.4 + i % 2 * 0.6} fill={color} opacity="0" />)}
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default spoonIn;
