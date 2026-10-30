import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const pieces = [[178, 228, 0], [204, 232, 40], [230, 226, -30], [190, 212, 70], [218, 210, 15], [204, 196, -50], [182, 196, 25]];

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
    const { color, resultImage } = props;
    return <>
      <CupBack {...props} />
      {resultImage}
      {pieces.map(([x, y, angle], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${angle})`}>
        <g className="piece-drop" opacity="0">
          {piece(i % 3, color)}
          <circle className="piece-shine" cx="-3" cy="-3" r="2" fill="#ffffff" opacity="0" />
        </g>
      </g>)}
      <CupFront {...props} />
    </>;
  },
};
export default addPieces;
