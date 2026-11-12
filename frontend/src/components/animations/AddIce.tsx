import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { stackOnFloor } from "./reach";
import { CUP, type ActionAnimation } from "./types";

// [offset from the vessel centre, stack row, tilt]
const cubes = [[-31, 0, -8], [-5, 0, 6], [21, 0, 12], [-19, 1, 14], [9, 1, -10], [-5, 2, 4]];

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
    const { anchor, openingRadiusY, floor = 236, resultImage, resultProgress } = props;
    const step = Math.max(0, Math.min(22, (floor - 12 - (anchor.y + openingRadiusY + 10)) / 2));
    const placed = stackOnFloor(props, cubes, floor - 12, step, 15);
    return <>
      <CupBack {...props} />
      {resultImage}
      <g style={{ opacity: 1 - resultProgress }}>
        {placed.map(([x, y, angle], i) => <g key={i} transform={`translate(${x} ${y})`}>
          <g className="ice-cube" opacity="0">
            <g transform={`rotate(${angle})`}>
              <rect x="-12" y="-12" width="24" height="24" rx="5" fill="#e3f0f2" fillOpacity="0.85" stroke="#a9c6cb" strokeWidth="1.5" />
              <path d="M-7 -6L-1 -8" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" className="ice-glint" opacity="0" />
            </g>
          </g>
        </g>)}
        {placed.slice(0, 3).map(([x, y], i) => <ellipse key={i} className="ice-splash" cx={x} cy={y + 12}
          rx="14" ry="3" fill="none" stroke="#cfe3e6" strokeWidth="1.5" opacity="0" />)}
      </g>
      <CupFront {...props} />
    </>;
  },
};
export default addIce;
