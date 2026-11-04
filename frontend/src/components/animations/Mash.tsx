import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { stackOnFloor } from "./reach";
import { CUP, type ActionAnimation } from "./types";

// [offset from the vessel centre, stack row, tilt]
const pieces = [[-25, 0, 0], [-7, 0, 0], [11, 0, 0], [27, 0, 0], [-15, 1, 0], [3, 1, 0], [19, 1, 0]];
const PRESS = 24;

const mash: ActionAnimation = {
  caption: "Press gently to release the juice",
  anchor: CUP,
  container: /glass|cup|mug|shaker|bowl/i,
  implement: /muddler|masher|pestle|spoon|fork/i,
  motion(tl) {
    tl.add(".cup-liquid", { y: [70, 70], duration: 1 }, 0);
    tl.add(".mash-tool", { y: [-70, 0], opacity: [0, 1], duration: 600 }, 0);
    for (let i = 0; i < 4; i++) {
      tl.add(".mash-tool", { y: [0, PRESS, 0], duration: 650 }, 700 + i * 700);
      tl.add(".mash-piece", { scaleY: 1 - (i + 1) * 0.15, scaleX: 1 + (i + 1) * 0.08, duration: 250 }, 900 + i * 700);
    }
    tl.add(".cup-liquid", { y: [70, 44], duration: 2800 }, 900);
    tl.add(".mash-tool", { y: -70, opacity: 0, duration: 600 }, 3900);
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress, anchor, openingRadiusY, floor = 236 } = props;
    const rise = Math.max(0, Math.min(10, (floor - 8 - (anchor.y + openingRadiusY + 10)) / 2));
    // Pressed pieces widen by up to a third.
    const placed = stackOnFloor(props, pieces, floor - 8, rise, 13);
    // At the bottom of each press the muddler meets the top of the pieces.
    const tip = Math.max(anchor.y + openingRadiusY + 6, floor - 16 - rise - PRESS);
    return <>
      <CupBack {...props} liquid={resultColor} />
      {resultImage}
      {placed.map(([cx, cy], i) => <ellipse key={i} className="mash-piece" cx={cx} cy={cy} rx="9" ry="8" fill={color}
        stroke="#00000026" strokeWidth="1.5" style={{ transformBox: "fill-box", transformOrigin: "center bottom", opacity: 1 - resultProgress }} />)}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="mash-tool">
          <ActionCutout src={implement} x={anchor.x - 19} y={tip - 180} width={40} height={180} tool tipDown fallback={
            <g transform={`translate(${anchor.x - 206} ${tip - 214})`}>
              <rect x="200" y="40" width="12" height="160" rx="6" fill="#b8955c" stroke="#94744a" strokeWidth="1.5" />
              <rect x="194" y="196" width="24" height="18" rx="7" fill="#a5844f" stroke="#94744a" strokeWidth="1.5" />
            </g>} />
        </g>
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default mash;
