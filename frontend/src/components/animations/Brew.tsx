import { stagger } from "animejs";
import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const brew: ActionAnimation = {
  caption: "Brew the espresso",
  anchor: CUP,
  container: /cup|mug|glass|jug/i,
  implement: /espresso|machine|moka|coffee maker|brewer/i,
  motion(tl) {
    tl.add(".brew-light", { opacity: [0.2, 1], duration: 400 }, 200);
    tl.add(".brew-stream", { scaleY: [0, 1], opacity: [0, 0.95], delay: stagger(120), duration: 500 }, 600);
    tl.add(".cup-liquid", { y: [55, 18], duration: 2800, ease: "linear" }, 900);
    tl.add(".brew-crema", { opacity: [0, 1], duration: 1600 }, 1800);
    tl.add(".brew-stream", { scaleY: [1, 0.2], opacity: [0.95, 0], duration: 400 }, 3700);
    tl.add(".brew-steam", { y: [6, -30], opacity: [0, 0.7, 0], delay: stagger(300), duration: 1200 }, 3400);
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={color}>
        <ellipse className="brew-crema" cx="205" cy="184" rx="48" ry="7" fill={resultColor} opacity="0" />
      </CupBack>
      {resultImage}
      {[200, 210].map(x => <path key={x} className="brew-stream" d={`M${x} 130V196`} stroke={color} strokeWidth="2.5"
        strokeLinecap="round" opacity="0" style={{ transformOrigin: `${x}px 130px` }} />)}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <ActionCutout src={implement} x={120} y={8} width={170} height={124} fallback={<>
          <rect x="128" y="10" width="154" height="88" rx="10" fill="#6f6259" stroke="#4a3f38" strokeWidth="2" />
          <rect x="140" y="22" width="60" height="22" rx="4" fill="#4a3f38" />
          <circle className="brew-light" cx="258" cy="33" r="5" fill="#e9a04b" opacity="0.2" />
          <rect x="180" y="98" width="50" height="16" rx="3" fill="#8d847a" stroke="#5f5750" strokeWidth="2" />
          <path d="M184 114H226L222 124H188Z" fill="#4a3f38" />
          <path d="M188 118H128" stroke="#3d322b" strokeWidth="9" strokeLinecap="round" />
          <path d="M198 124V130M212 124V130" stroke="#5f5750" strokeWidth="4" />
        </>} />
      </g>
      <g fill="none" stroke="#e8dcc6" strokeWidth="2.5" strokeLinecap="round">
        {[192, 218].map(x => <path key={x} className="brew-steam" opacity="0" d={`M${x} 160q-8-10 0-20t0-20`} />)}
      </g>
      <CupFront {...props} liquid={color} />
    </>;
  },
};
export default brew;
