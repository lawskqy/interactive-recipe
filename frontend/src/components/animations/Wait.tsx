import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const wait: ActionAnimation = {
  caption: "Let it rest",
  anchor: CUP,
  container: /cup|mug|glass|bowl|jug|saucepan/i,
  motion(tl) {
    tl.add(".wait-timer", { scale: [0.6, 1], opacity: [0, 1], duration: 500, ease: "outBack" }, 0);
    tl.add(".wait-hand", { rotate: [0, 360], duration: 3400, ease: "linear" }, 500);
    for (let i = 0; i < 3; i++) {
      tl.add(".wait-steam", { y: [6, -30], opacity: [0, 0.8 - i * 0.3, 0], delay: stagger(300), duration: 1100 }, 500 + i * 1100);
    }
    tl.add(".wait-timer", { scale: [1, 1.12, 1], duration: 400 }, 3900);
  },
  Scene(props) {
    const { color, resultImage } = props;
    return <>
      <CupBack {...props} liquid={color} />
      {resultImage}
      <g fill="none" stroke="#e8dcc6" strokeWidth="2.5" strokeLinecap="round">
        {[190, 220].map(x => <path key={x} className="wait-steam" opacity="0" d={`M${x} 158q-8-10 0-20t0-20`} />)}
      </g>
      <g className="wait-timer" opacity="0" style={{ transformOrigin: "100px 120px" }}>
        <rect x="94" y="80" width="12" height="8" rx="2" fill="#b8955c" />
        <circle cx="100" cy="120" r="32" fill="#f5edda" stroke="#b89a70" strokeWidth="3" />
        {[0, 90, 180, 270].map(angle => <path key={angle} d="M100 92V97" stroke="#8a6a3f" strokeWidth="2"
          transform={`rotate(${angle} 100 120)`} />)}
        <path className="wait-hand" d="M100 120V98" stroke="#5c4a3d" strokeWidth="3" strokeLinecap="round"
          style={{ transformOrigin: "100px 120px" }} />
        <circle cx="100" cy="120" r="3" fill="#5c4a3d" />
      </g>
      <CupFront {...props} liquid={color} />
    </>;
  },
};
export default wait;
