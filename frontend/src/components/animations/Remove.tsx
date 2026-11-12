import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { TeaBag } from "./TeaBag";
import { CUP, type ActionAnimation } from "./types";

const remove: ActionAnimation = {
  caption: "Lift it out and let it drip",
  anchor: CUP,
  container: /cup|mug|glass|teapot|jug|saucepan/i,
  motion(tl) {
    tl.add(".remove-bag", { y: [0, -110], duration: 1600, ease: "inOutQuad" }, 400);
    for (let i = 0; i < 3; i++) {
      tl.add(".remove-drip", { y: [0, 74], opacity: [0, 1, 0], delay: stagger(140), duration: 600, ease: "inQuad" }, 2000 + i * 600);
    }
    tl.add(".remove-ripple", { scale: [0.3, 1.2], opacity: [0, 0.7, 0], delay: stagger(600), duration: 700 }, 2500);
    tl.add(".remove-bag", { x: [0, 70], opacity: [1, 0], duration: 700 }, 3900);
  },
  Scene(props) {
    const { color, resultColor, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={resultColor}>
        {[0, 1, 2].map(i => <ellipse key={i} className="remove-ripple" cx="212" cy="186" rx="16" ry="3" fill="none"
          stroke="#fff7e2" strokeWidth="1.5" opacity="0" style={{ transformOrigin: "212px 186px" }} />)}
      </CupBack>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <TeaBag className="remove-bag" leaves={color} />
        {[206, 212, 218].map(x => <circle key={x} className="remove-drip" cx={x} cy="110" r="2.5" fill={resultColor} opacity="0" />)}
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default remove;
