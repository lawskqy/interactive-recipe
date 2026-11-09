import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import CutFruit from "./CutFruit";
import CutKnife from "./CutKnife";
import { stackOnFloor } from "./reach";
import { CUP, type ActionAnimation, type SceneGeometry } from "./types";
import { tint } from "../../lib/tint";

// Seen three-quarter on, the knife lies across the fruit with its handle towards the viewer:
// its length runs down-right on screen (AXIS per unit), handle in the right hand, and its blade face stays upright.
const AXIS = { x: 0.55, y: 0.42 };
const KNIFE_SCALE = 1.3;
const TIP = { x: -64, y: 7 };
// Along the blade from the tip: where it crosses the fruit's middle, how far the edge sits below the tip,
// and the fruit's half depth, all in knife units.
const REACH = 34;
const EDGE = 3;
const DEPTH = 19;
// Handle raised while the knife is lifted; it levels out as the blade pushes forward through the fruit.
const ROCK = -10;
const SLIDE = 8;
// The board's back edge recedes up and left.
const SHEAR = -21;
const FRUIT = { width: 80, height: 58 };
// The drawn fruit is sketched at 68 wide.
const DRAWN_SCALE = FRUIT.width / 68;
const HOVER = 14;
const DROP = FRUIT.height + HOVER;
const SPRAY = [[8, -14], [14, -6], [-4, -12]];
// [offset from the vessel centre, stack row, tilt] for the pieces dropped into the vessel
const LANDING = [[-18, 0, 0], [0, 0, 0], [18, 0, 0], [-9, 1, 0], [9, 1, 0]];

// With a vessel the board sits beside it and the pieces go in; alone, the board is centred.
function stage(scene: SceneGeometry) {
  const transfer = scene.floor !== undefined;
  const base = transfer ? scene.anchor.y + (scene.floor! - scene.anchor.y) / 0.9 : 250;
  const boardTop = base - 14;
  const fx = transfer ? 76 : 180;
  // Piece k lies between bounds[k + 1] and bounds[k]; cuts run from right to left.
  const bounds = [47, 22, 7, -8, -22, -47].map(offset => fx + offset);
  const pieces = bounds.slice(0, 5).map((right, k) => ({ x: (right + bounds[k + 1]) / 2, y: boardTop - FRUIT.height / 2 + 2 }));
  const landing = transfer ? stackOnFloor(scene, LANDING, scene.floor! - 8, 12, 9) : [];
  return { transfer, boardTop, fx, bounds, pieces, landing, board: transfer ? [12, 140] : [102, 278] };
}

// Lifted, the knife sits pulled back towards the handle so each cut pushes forward as it drops.
const pulled = { x: AXIS.x * KNIFE_SCALE * SLIDE, y: AXIS.y * KNIFE_SCALE * SLIDE };

const cut: ActionAnimation = {
  caption: "Cut into pieces",
  anchor: CUP,
  container: /glass|cup|mug|bowl|jar|shaker|blender|pitcher|jug|tumbler/i,
  surface: /board|plate|counter|tray/i,
  implement: /knife|peeler/i,
  motion(tl, geometry) {
    const { transfer, bounds, pieces, landing } = stage(geometry);
    const offset = (i: number) => bounds[Math.min(i, 3) + 1] - bounds[1];
    tl.add(".cut-knife", { x: [60, pulled.x], y: [-40, pulled.y], opacity: [0, 1], duration: 450, ease: "outCubic" }, 0);
    tl.add(".cut-rock", { rotate: [ROCK, ROCK], duration: 450 }, 0);
    // Each cut pushes the blade forward and down through the fruit, then lifts it back to the next cut.
    for (let i = 0; i < 4; i++) {
      const at = 550 + i * 620;
      tl.add(".cut-cover", { x: offset(i), duration: 1 }, at);
      tl.add(".cut-knife", { x: offset(i), y: DROP, duration: 260, ease: "inOutQuad" }, at);
      tl.add(".cut-rock", { rotate: 0, duration: 260, ease: "inOutQuad" }, at);
      tl.add(`.cut-face-${i}`, { opacity: 1, duration: 120 }, at + 150);
      tl.add(`.cut-piece-${i}`, { x: 6, rotate: 8, duration: 280, ease: "outQuad" }, at + 220);
      SPRAY.forEach(([dx, dy], j) => tl.add(`.cut-juice-${i}-${j}`, { x: [0, dx], y: [0, dy, dy + 6], opacity: [0, 1, 0],
        duration: 360, ease: "outQuad" }, at + 200));
      tl.add(".cut-knife", { x: offset(i + 1) + pulled.x, y: pulled.y, duration: 300, ease: "outQuad" }, at + 300);
      tl.add(".cut-rock", { rotate: ROCK, duration: 300, ease: "outQuad" }, at + 300);
    }
    tl.add(".cut-knife", { x: offset(3) + 60, y: -70, opacity: 0, duration: 450, ease: "inCubic" }, 3000);
    pieces.forEach((piece, k) => {
      const at = 3300 + k * 170;
      if (!transfer) { tl.add(`.cut-piece-${k}`, { x: (4 - k) * 6, duration: 400, ease: "outQuad" }, at); return; }
      // Hop each piece over the rim and down onto the vessel floor.
      const [lx, ly] = landing[k];
      tl.add(`.cut-piece-${k}`, { x: lx - piece.x, scale: 0.55, rotate: 120 + k * 40, duration: 650, ease: "linear" }, at);
      tl.add(`.cut-piece-${k}`, { y: Math.min(0, ly - piece.y) - 60, duration: 300, ease: "outQuad" }, at);
      tl.add(`.cut-piece-${k}`, { y: ly - piece.y, duration: 350, ease: "inQuad" }, at + 300);
    });
  },
  Scene(props) {
    const { clip, color, source, subject, implement, resultImage, resultProgress } = props;
    const { transfer, boardTop, fx, bounds, pieces, board: [left, right] } = stage(props);
    const strawberry = !source && /strawberr|berr/i.test(subject);
    const flesh = strawberry ? "#f2b3b0" : tint(color, 0.4);
    const middle = boardTop + 2 - FRUIT.height / 2;
    const fruit = source
      ? <ActionCutout src={source} x={fx - FRUIT.width / 2} y={boardTop + 2 - FRUIT.height} {...FRUIT} tipDown />
      : <g transform={`translate(${fx} ${middle}) scale(${DRAWN_SCALE}) translate(${-fx} ${-middle})`}>
        <CutFruit strawberry={strawberry} color={color} x={fx} y={middle} />
      </g>;
    // A slice that tips away bares its cut face along its left edge.
    const face = (k: number) => k < 4 && <g mask={`url(#${clip}-fruit-mask)`}>
      <rect className={`cut-face-${k}`} x={bounds[k + 1]} y={boardTop - 120} width="3" height="140" fill={flesh} opacity="0" />
    </g>;
    // The knife is placed by its tip, so that at the first cut its edge meets the board under the fruit's middle.
    const knife = { x: bounds[1] - AXIS.x * KNIFE_SCALE * REACH, y: boardTop - 3 - KNIFE_SCALE * (AXIS.y * REACH + EDGE) - DROP };
    const big = { x: -1000, y: -1000, width: 3000, height: 3000 };
    // The knife is drawn in three lengths: the part behind the fruit, the part inside it and the part in front.
    // Fruit hides what is behind it; inside, only the uncut fruit on the near (left) side of the blade covers it.
    const part = (name: string, from: number, to: number) => <g key={name} mask={name === "front" ? undefined : `url(#${clip}-knife-${name})`}>
      <defs><clipPath id={`${clip}-knife-${name}-length`}><rect x={from} y="-1000" width={to - from} height="2000" /></clipPath></defs>
      <g transform={`translate(${knife.x} ${knife.y})`}>
        <g className="cut-knife" opacity="0">
          <g transform={`matrix(${AXIS.x * KNIFE_SCALE} ${AXIS.y * KNIFE_SCALE} 0 ${KNIFE_SCALE} 0 0)`}>
            <g clipPath={`url(#${clip}-knife-${name}-length)`}>
              <g className="cut-rock" style={{ transformOrigin: "0px 0px" }}>
                <g transform={`translate(${-TIP.x} ${-TIP.y})`}><CutKnife src={implement} /></g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>;
    return <>
      {transfer && <CupBack {...props} />}
      {resultImage}
      <defs>
        {pieces.map((_, k) => <clipPath key={k} id={`${clip}-piece-${k}`}>
          <rect x={bounds[k + 1]} y={boardTop - 120} width={bounds[k] - bounds[k + 1]} height="140" />
        </clipPath>)}
        <mask id={`${clip}-fruit-mask`} style={{ maskType: "alpha" }}>{fruit}</mask>
        <mask id={`${clip}-knife-back`} maskUnits="userSpaceOnUse" {...big}>
          <rect {...big} fill="white" />
          <g mask={`url(#${clip}-fruit-mask)`}><rect {...big} fill="black" /></g>
        </mask>
        <mask id={`${clip}-knife-inside`} maskUnits="userSpaceOnUse" {...big}>
          <rect {...big} fill="white" />
          <g mask={`url(#${clip}-fruit-mask)`}><rect className="cut-cover" x={bounds[1] - 1000} y="-1000" width="1000" height="3000" fill="black" /></g>
        </mask>
      </defs>
      <g style={{ opacity: 1 - resultProgress }}>
        <path d={`M${left} ${boardTop + 6}H${right}L${right + SHEAR} ${boardTop - 10}H${left + SHEAR}Z`} fill="#b48a55" />
        <path d={`M${left} ${boardTop + 6}L${left + SHEAR} ${boardTop - 10}V${boardTop - 2}L${left} ${boardTop + 14}Z`} fill="#7a5a33" />
        <rect x={left} y={boardTop + 6} width={right - left} height="8" fill="#8f6a3e" />
        <path d={`M${left + 20 + SHEAR / 2} ${boardTop - 2}H${right - 30 + SHEAR / 2}M${left + 40 + SHEAR / 4} ${boardTop + 2}H${right - 16 + SHEAR / 4}`}
          stroke="#c9a06a" strokeWidth="1.2" opacity="0.6" />
        {pieces.map((piece, k) => <g key={k} className={`cut-piece-${k}`} style={{ transformOrigin: `${piece.x}px ${piece.y}px` }}>
          <g clipPath={`url(#${clip}-piece-${k})`}>{fruit}{face(k)}</g>
        </g>)}
        {bounds.slice(1, 5).map((x, i) => SPRAY.map((_, j) => <circle key={`${i}-${j}`} className={`cut-juice-${i}-${j}`}
          cx={x} cy={boardTop - 18} r={j === 1 ? 1.4 : 1.9} fill={strawberry ? "#d3333b" : color} opacity="0" />))}
      </g>
      {transfer && <CupFront {...props} />}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        {part("back", -1000, REACH - DEPTH + 0.5)}
        {part("inside", REACH - DEPTH, REACH + DEPTH)}
        {part("front", REACH + DEPTH - 0.5, 1000)}
      </g>
    </>;
  },
};
export default cut;
