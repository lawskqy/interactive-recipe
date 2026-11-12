import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const bubbles = [[178, 182, 5], [196, 178, 4], [214, 183, 6], [232, 179, 4], [188, 186, 3], [224, 187, 3]];

const tap: ActionAnimation = {
  caption: "Tap to settle the bubbles",
  anchor: CUP,
  container: /jug|pitcher|cup|mug|glass/i,
  motion(tl) {
    for (let i = 0; i < 2; i++) {
      const at = 500 + i * 1400;
      tl.add(".tap-body", { y: [0, -26], duration: 450, ease: "outQuad" }, at);
      tl.add(".tap-body", { y: [-26, 0], duration: 180, ease: "inQuad" }, at + 450);
      tl.add(".tap-knock", { scale: [0.4, 1.3], opacity: [0, 0.8, 0], duration: 500 }, at + 630);
      tl.add(`.tap-bubble-${i}`, { scale: [1, 0], opacity: [1, 0], delay: stagger(60), duration: 300 }, at + 640);
    }
    tl.add(".tap-surface", { scaleX: [0.9, 1.05, 1], duration: 600 }, 3500);
  },
  Scene(props) {
    const { color, resultColor, resultImage } = props;
    return <>
      <path className="tap-knock" d="M150 258Q205 266 260 258" fill="none" stroke="#e8dcc6" strokeWidth="2" opacity="0"
        style={{ transformOrigin: "205px 260px" }} />
      <g className="tap-body">
        <CupBack {...props} liquid={color}>
          <path className="tap-surface" d="M152 184Q205 174 259 184V192H152Z" fill={resultColor} style={{ transformOrigin: "205px 186px" }} />
          {bubbles.map(([cx, cy, r], i) => <circle key={i} className={`tap-bubble-${i % 2}`} cx={cx} cy={cy} r={r} fill="none"
            stroke="#fffaf0" strokeWidth="1.5" style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}
        </CupBack>
        {resultImage}
        <CupFront {...props} liquid={color} />
      </g>
    </>;
  },
};
export default tap;
