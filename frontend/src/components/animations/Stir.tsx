import { stagger } from "animejs";
import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const stir: ActionAnimation = {
  caption: "Stir until combined",
  anchor: CUP,
  container: /cup|glass|mug|saucepan|jug|bowl/i,
  implement: /spoon|stirrer/i,
  motion(tl) {
    tl.add(".stir-motion", { y: [-40, 0], opacity: [0, 1], duration: 500 }, 0);
    for (let i = 0; i < 8; i++) {
      tl.add(".stir-motion", { x: [-15, 15, -15], y: [0, 5, 0], rotate: [-5, 5, -5], duration: 420 }, 500 + i * 420);
    }
    tl.add(".stir-swirl", { opacity: [0, 0.8], duration: 400 }, 500);
    for (let i = 0; i < 6; i++) {
      tl.add(".stir-swirl", { scaleX: [1, 0.6, 1], x: [-6, 6, -6], duration: 560 }, 600 + i * 560);
    }
    tl.add(".stir-swirl", { opacity: 0, duration: 500 }, 3800);
    tl.add(".stir-drop", { opacity: [0.95, 0], scale: [1, 0.3], x: [0, 10], delay: stagger(160), duration: 2400 }, 700);
    tl.add(".stir-motion", { y: -40, opacity: 0, duration: 600 }, 4000);
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={resultColor}>
        {[[188, 196], [214, 204], [228, 192], [198, 214], [220, 222]].map(([cx, cy], i) =>
          <ellipse key={i} className="stir-drop" cx={cx} cy={cy} rx={6 + i % 2 * 3} ry={3 + i % 2} fill={color} />)}
        <g className="stir-swirl" fill="none" stroke="#fff7e2" strokeWidth="2" opacity="0">
          <path d="M172 186Q205 176 238 186" /><path d="M184 192Q205 186 226 192" />
        </g>
      </CupBack>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="stir-motion">
          <ActionCutout src={implement} x={176} y={48} width={56} height={170} tool fallback={<>
            <path d="M226 52L208 196" stroke="#c5a16a" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="206" cy="204" rx="9" ry="14" transform="rotate(8 206 204)" fill="#d8bd8a" stroke="#b89a70" strokeWidth="2" />
          </>} />
        </g>
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default stir;
