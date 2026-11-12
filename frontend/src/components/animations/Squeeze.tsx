import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const squeeze: ActionAnimation = {
  caption: "Squeeze in the juice",
  anchor: CUP,
  container: /glass|cup|mug|jug|bowl/i,
  motion(tl) {
    tl.add(".squeeze-fruit", { y: [-50, 0], opacity: [0, 1], duration: 600 }, 0);
    for (let i = 0; i < 4; i++) {
      tl.add(".squeeze-fruit", { scaleX: [1, 0.8, 1], scaleY: [1, 1.1, 1], duration: 600 }, 700 + i * 720);
      tl.add(".squeeze-drop", { y: [0, 76], opacity: [0, 1, 0], delay: stagger(90), duration: 600, ease: "inQuad" }, 950 + i * 720);
      tl.add(".squeeze-ring", { scale: [0.3, 1.2], opacity: [0, 0.6, 0], duration: 600 }, 1450 + i * 720);
    }
    tl.add(".squeeze-fruit", { y: -50, opacity: 0, duration: 600 }, 4000);
  },
  Scene(props) {
    const { color, resultColor, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={resultColor}>
        <ellipse className="squeeze-ring" cx="205" cy="186" rx="18" ry="4" fill="none" stroke="#fff7e2" strokeWidth="1.5"
          opacity="0" style={{ transformOrigin: "205px 186px" }} />
      </CupBack>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="squeeze-fruit" style={{ transformOrigin: "205px 104px" }}>
          <path d="M175 104A30 30 0 0 1 235 104Z" fill={color} stroke="#00000030" strokeWidth="2" />
          <path d="M179 104A26 26 0 0 1 231 104Z" fill="#fff7e2" opacity="0.35" />
          <ellipse cx="205" cy="105" rx="30" ry="5" fill={color} stroke="#00000030" strokeWidth="1.5" />
          {[-16, 0, 16].map(dx => <path key={dx} d={`M205 105L${205 + dx * 1.6} 108`} stroke="#fff7e2" strokeWidth="1.2" opacity="0.8" />)}
        </g>
        {[200, 208, 214].map(x => <path key={x} className="squeeze-drop" d={`M${x} 110q-3 5 0 7q3-2 0-7z`} fill={color} opacity="0" />)}
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default squeeze;
