import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { TeaBag } from "./TeaBag";
import { CUP, type ActionAnimation } from "./types";

const steep: ActionAnimation = {
  caption: "Steep and let the colour bloom",
  anchor: CUP,
  container: /cup|mug|glass|teapot|jug|saucepan/i,
  motion(tl) {
    tl.add(".steep-bag", { y: [-90, 0], opacity: [0, 1], duration: 900 }, 0);
    for (let i = 0; i < 3; i++) {
      tl.add(".steep-bag", { y: [0, -10, 0], duration: 700 }, 1100 + i * 900);
    }
    tl.add(".steep-cloud", { scale: [0.2, 1.6], opacity: [0, 0.7, 0], delay: stagger(350), duration: 1800 }, 900);
    tl.add(".steep-tint", { opacity: [0, 0.95], duration: 3000 }, 1000);
    tl.add(".brew-steam", { y: [6, -34], opacity: [0, 0.7, 0], delay: stagger(400), duration: 1500 }, 2300);
  },
  Scene(props) {
    const { color, resultColor, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid="#e3e6dc">
        <path className="steep-tint" d="M152 185Q205 170 259 185V258H152Z" fill={resultColor} opacity="0" />
        {[[212, 214], [190, 226], [232, 228], [208, 238]].map(([cx, cy], i) => <ellipse key={i} className="steep-cloud"
          cx={cx} cy={cy} rx="14" ry="8" fill={resultColor} opacity="0" style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}
      </CupBack>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <TeaBag className="steep-bag" leaves={color} />
      </g>
      <g fill="none" stroke="#e8dcc6" strokeWidth="2.5" strokeLinecap="round">
        {[188, 222].map(x => <path key={x} className="brew-steam" opacity="0" d={`M${x} 160q-8-10 0-20t0-20`} />)}
      </g>
      <CupFront {...props} />
    </>;
  },
};
export default steep;
