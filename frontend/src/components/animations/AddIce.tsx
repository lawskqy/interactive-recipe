import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const cubes = [[174, 222, -8], [200, 226, 6], [226, 220, 12], [186, 200, 14], [214, 202, -10], [200, 180, 4]];

const addIce: ActionAnimation = {
  caption: "Fill the glass with ice",
  anchor: CUP,
  container: /glass|cup|mug|shaker|jug/i,
  motion(tl) {
    tl.add(".ice-cube", { y: [-190, 0], opacity: [0, 1], rotate: [-25, 0], delay: stagger(380), duration: 900, ease: "outBounce" }, 300);
    tl.add(".ice-splash", { scale: [0.4, 1.2], opacity: [0, 0.7, 0], delay: stagger(380), duration: 600 }, 900);
    tl.add(".ice-glint", { opacity: [0, 0.9, 0.4], duration: 700 }, 3200);
  },
  Scene(props) {
    const { resultImage } = props;
    return <>
      <CupBack {...props} />
      {resultImage}
      {cubes.map(([x, y, angle], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}>
        <g className="ice-cube" opacity="0">
          <rect x="-12" y="-12" width="24" height="24" rx="5" fill="#e3f0f2" fillOpacity="0.85" stroke="#a9c6cb" strokeWidth="1.5" />
          <path d="M-7 -6L-1 -8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" className="ice-glint" opacity="0" />
        </g>
      </g>)}
      {cubes.slice(0, 3).map(([x, y], i) => <ellipse key={i} className="ice-splash" cx={x} cy={y + 12}
        rx="14" ry="3" fill="none" stroke="#cfe3e6" strokeWidth="1.5" opacity="0" />)}
      <CupFront {...props} />
    </>;
  },
};
export default addIce;
