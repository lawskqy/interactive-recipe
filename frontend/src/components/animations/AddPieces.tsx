import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

// [offset from the vessel centre, stack row, tilt]
const pieces = [[-27, 0, 0], [-1, 0, 40], [25, 0, -30], [-15, 1, 70], [13, 1, 15], [-1, 2, -50], [-23, 2, 25]];

function piece(shape: number, color: string) {
  if (shape === 0) return <circle r="9" fill={color} stroke="#00000026" strokeWidth="1.5" />;
  if (shape === 1) return <path d="M-11 2A11 11 0 0 1 11 2Z" fill={color} stroke="#00000026" strokeWidth="1.5" />;
  return <rect x="-8" y="-7" width="16" height="14" rx="3" fill={color} stroke="#00000026" strokeWidth="1.5" />;
}

const addPieces: ActionAnimation = {
  caption: "Add the pieces",
  anchor: CUP,
  container: /glass|cup|mug|shaker|bowl|blender|jug|saucepan/i,
  motion(tl) {
    tl.add(".piece-drop", { y: [-170, 0], opacity: [0, 1], rotate: [-60, 0], delay: stagger(330), duration: 850, ease: "outBounce" }, 300);
    tl.add(".piece-shine", { opacity: [0, 0.8, 0.5], duration: 600 }, 3200);
  },
  Scene(props) {
    const { anchor, openingRadiusY, floor = 236, color, resultImage, resultProgress } = props;
    const step = Math.max(0, Math.min(16, (floor - 8 - (anchor.y + openingRadiusY + 10)) / 2));
    const placed = pieces.map(([dx, row, angle]) => [anchor.x + dx * (row ? 1 : 0.85), floor - 8 - row * step, angle]);
    return <>
      <CupBack {...props} />
      {resultImage}
      <g style={{ opacity: 1 - resultProgress }}>
        {placed.map(([x, y, angle], i) => <g key={i} transform={`translate(${x} ${y})`}>
          <g className="piece-drop" opacity="0">
            <g transform={`rotate(${angle})`}>
              {piece(i % 3, color)}
              <circle className="piece-shine" cx="-3" cy="-3" r="2" fill="#ffffff" opacity="0" />
            </g>
          </g>
        </g>)}
      </g>
      <CupFront {...props} />
    </>;
  },
};
export default addPieces;
