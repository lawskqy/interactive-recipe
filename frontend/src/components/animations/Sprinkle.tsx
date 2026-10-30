import { stagger } from "animejs";
import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const specks = Array.from({ length: 16 }, (_, i) => [176 + (i * 23) % 58, 180 + (i * 7) % 8]);

const sprinkle: ActionAnimation = {
  caption: "Sprinkle a pinch on top",
  anchor: CUP,
  container: /cup|mug|glass|bowl/i,
  implement: /shaker|jar|grinder|grater/i,
  motion(tl) {
    tl.add(".sprinkle-jar", { x: [-60, 0], opacity: [0, 1], duration: 600 }, 0);
    for (let i = 0; i < 5; i++) {
      tl.add(".sprinkle-jar", { x: [i * 8 - 16, i * 8 - 12], y: [0, -10, 0], duration: 420 }, 700 + i * 520);
      tl.add(".sprinkle-fall", { x: i * 8 - 16, y: [0, 64], opacity: [0, 1, 0], delay: stagger(25), duration: 520, ease: "inQuad" },
        820 + i * 520);
    }
    tl.add(".sprinkle-speck", { opacity: [0, 1], scale: [0, 1], delay: stagger(120), duration: 300 }, 1200);
    tl.add(".sprinkle-jar", { x: 60, opacity: 0, duration: 600 }, 3800);
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={resultColor} />
      {resultImage}
      {specks.map(([cx, cy], i) => <circle key={i} className="sprinkle-speck" cx={cx} cy={cy} r={1.4 + i % 3 * 0.5} fill={color}
        opacity="0" style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="sprinkle-jar">
          <ActionCutout src={implement} x={176} y={56} width={56} height={66} fallback={
            <g transform="rotate(-25 205 90)">
              <rect x="190" y="62" width="30" height="40" rx="5" fill="#e9ddc4" stroke="#b59b73" strokeWidth="2" />
              <rect x="192" y="80" width="26" height="18" rx="3" fill={color} opacity="0.8" />
              <rect x="188" y="100" width="34" height="12" rx="3" fill="#b8955c" />
              {[196, 205, 214].map(x => <circle key={x} cx={x} cy="110" r="1.5" fill="#5c4a3d" />)}
            </g>} />
        </g>
        {Array.from({ length: 8 }, (_, i) => <circle key={i} className="sprinkle-fall" cx={198 + i % 4 * 5} cy={122 + i % 2 * 4}
          r="1.6" fill={color} opacity="0" />)}
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default sprinkle;
