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
// The board's top face runs from its back edge to its front edge along the knife's axis, deep enough
// that the blade up to its bolster rests on it.
const BOARD = { back: -10, front: 18, thickness: 8 };
const SHEAR = (BOARD.back - BOARD.front) * AXIS.x / AXIS.y;
const FRUIT = { width: 80, height: 58 };
// The drawn fruit is sketched at 68 wide.
const DRAWN_SCALE = FRUIT.width / 68;
const HOVER = 14;
const DROP = FRUIT.height + HOVER;
const SPRAY = [[8, -14], [14, -6], [-4, -12]];
// [offset from the vessel centre, stack row, tilt] for the pieces dropped into the vessel
const LANDING = [[-18, 0, 0], [0, 0, 0], [18, 0, 0], [-9, 1, 0], [9, 1, 0]];
const FAR = { top: -1000, bottom: 2000, left: -1000, right: 2000 };

// With a vessel the board sits beside it and the pieces go in; alone, the board is centred.
function stage(scene: SceneGeometry) {
  const transfer = scene.floor !== undefined;
  const base = transfer ? scene.anchor.y + (scene.floor! - scene.anchor.y) / 0.9 : 250;
  const boardTop = base - BOARD.front - BOARD.thickness;
  const fx = transfer ? 76 : 180;
  const middle = boardTop + 2 - FRUIT.height / 2;
  // Piece k lies between bounds[k + 1] and bounds[k]; cuts run from right to left.
  const bounds = [47, 22, 7, -8, -22, -47].map(offset => fx + offset);
  const pieces = bounds.slice(0, 5).map((right, k) => ({ x: (right + bounds[k + 1]) / 2, y: middle }));
  const landing = transfer ? stackOnFloor(scene, LANDING, scene.floor! - 8, 12, 9) : [];
  // The board's front edge sits right of the fruit by the shear between the fruit's depth and the front.
  const centre = fx - SHEAR * (BOARD.front - 2) / (BOARD.front - BOARD.back);
  const half = transfer ? 54 : 88;
  return { transfer, boardTop, middle, fx, bounds, pieces, landing, board: [centre - half, centre + half] };
}

// Each cut is a straight line leaning slightly down-right, the way the knife runs towards the viewer.
const LEAN = 3;
function seam(x: number, middle: number, downward: boolean) {
  const r = FRUIT.height / 2;
  const top = `${x - LEAN} ${middle - r}`, bottom = `${x + LEAN} ${middle + r}`;
  return downward ? `L${top}L${bottom}` : `L${bottom}L${top}`;
}
// Everything between two cuts; an outer side with no cut reaches far beyond the fruit.
function between(left: number | undefined, right: number | undefined, middle: number) {
  const down = left === undefined ? `M${FAR.left} ${FAR.top}V${FAR.bottom}` : `M${left} ${FAR.top}${seam(left, middle, true)}V${FAR.bottom}`;
  const up = right === undefined ? `H${FAR.right}V${FAR.top}` : `H${right}${seam(right, middle, false)}V${FAR.top}`;
  return down + up + "Z";
}

// Lifted, the knife sits pulled back towards the handle so each cut pushes forward as it drops.
const pulled = { x: AXIS.x * KNIFE_SCALE * SLIDE, y: AXIS.y * KNIFE_SCALE * SLIDE };
// How far the edge above the cut falls during one cut: the drop plus the height the raised handle tilt adds.
const tilt = ROCK * Math.PI / 180;
const LIFT = KNIFE_SCALE * (AXIS.y * REACH + EDGE) - (AXIS.y * KNIFE_SCALE * (REACH * Math.cos(tilt) - EDGE * Math.sin(tilt))
  + KNIFE_SCALE * (REACH * Math.sin(tilt) + EDGE * Math.cos(tilt)));
const TRAVEL = DROP - pulled.y + LIFT;
const DOWN = 260;

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
    // The slit opens down to the edge on the same curve; the slice parts only once the blade meets the board.
    for (let i = 0; i < 4; i++) {
      const at = 550 + i * 620;
      // A path's or rect's x is its own attribute in anime.js, so these move by translate.
      tl.add(".cut-cover", { translateX: offset(i), duration: 1 }, at);
      tl.add(".cut-knife", { x: offset(i), y: DROP, duration: DOWN, ease: "inOutQuad" }, at);
      tl.add(".cut-rock", { rotate: 0, duration: DOWN, ease: "inOutQuad" }, at);
      tl.add(`.cut-opened-${i}`, { translateY: [-TRAVEL, 0], duration: DOWN, ease: "inOutQuad" }, at);
      tl.add(`.cut-opened-${i}`, { translateY: 8, duration: 1 }, at + DOWN);
      tl.add(`.cut-piece-${i}`, { x: 6, rotate: 8, duration: 280, ease: "outQuad" }, at + DOWN);
      SPRAY.forEach(([dx, dy], j) => tl.add(`.cut-juice-${i}-${j}`, { x: [0, dx], y: [0, dy, dy + 6], opacity: [0, 1, 0],
        duration: 360, ease: "outQuad" }, at + DOWN - 20));
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
    const { transfer, boardTop, middle, fx, bounds, pieces, board: [left, right] } = stage(props);
    const strawberry = !source && /strawberr|berr/i.test(subject);
    const flesh = strawberry ? "#f2b3b0" : tint(color, 0.4);
    const fruit = source
      ? <ActionCutout src={source} x={fx - FRUIT.width / 2} y={boardTop + 2 - FRUIT.height} {...FRUIT} tipDown />
      : <g transform={`translate(${fx} ${middle}) scale(${DRAWN_SCALE}) translate(${-fx} ${-middle})`}>
        <CutFruit strawberry={strawberry} color={color} x={fx} y={middle} />
      </g>;
    // The slit along a slice's left side opens as far down as the edge has gone, and shows as the cut face when the slice tips away.
    const edgeLine = (x: number) => {
      const y = boardTop - 3, run = 200, rise = run * AXIS.y / AXIS.x;
      return `M${x - run} ${y - rise}L${x + run} ${y + rise}V${FAR.top}H${x - run}Z`;
    };
    const face = (k: number) => k < 4 && <g mask={`url(#${clip}-fruit-mask)`}>
      <g mask={`url(#${clip}-opened-${k})`}>
        <path d={"M" + seam(bounds[k + 1], middle, true).slice(1)} fill="none" stroke={flesh} strokeWidth="5" />
      </g>
    </g>;
    // The knife is placed by its tip, so that at the first cut its edge meets the board under the fruit's middle.
    const knife = { x: bounds[1] - AXIS.x * KNIFE_SCALE * REACH, y: boardTop - 3 - KNIFE_SCALE * (AXIS.y * REACH + EDGE) - DROP };
    const big = { x: -1000, y: -1000, width: 3000, height: 3000 };
    // The knife is drawn in three lengths: the part behind the fruit, the part inside it and the part in front.
    // Fruit hides what is behind it; inside, only the uncut fruit on the near (left) side of the cut covers it.
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
    const along = (y: number) => SHEAR * (boardTop + BOARD.front - y) / (BOARD.front - BOARD.back);
    const front = boardTop + BOARD.front, back = boardTop + BOARD.back;
    return <>
      {transfer && <CupBack {...props} />}
      {resultImage}
      <defs>
        {pieces.map((_, k) => <clipPath key={k} id={`${clip}-piece-${k}`}>
          <path d={between(k === 4 ? undefined : bounds[k + 1], k === 0 ? undefined : bounds[k], middle)} />
        </clipPath>)}
        {pieces.slice(0, 4).map((_, k) => <mask key={k} id={`${clip}-opened-${k}`} maskUnits="userSpaceOnUse" {...big}>
          <path className={`cut-opened-${k}`} d={edgeLine(bounds[k + 1])} fill="white" style={{ transform: `translateY(${-TRAVEL}px)` }} />
        </mask>)}
        <mask id={`${clip}-fruit-mask`} style={{ maskType: "alpha" }}>{fruit}</mask>
        <mask id={`${clip}-knife-back`} maskUnits="userSpaceOnUse" {...big}>
          <rect {...big} fill="white" />
          <g mask={`url(#${clip}-fruit-mask)`}><rect {...big} fill="black" /></g>
        </mask>
        <mask id={`${clip}-knife-inside`} maskUnits="userSpaceOnUse" {...big}>
          <rect {...big} fill="white" />
          <g mask={`url(#${clip}-fruit-mask)`}><path className="cut-cover" d={between(undefined, bounds[1], middle)} fill="black" /></g>
        </mask>
      </defs>
      <g style={{ opacity: 1 - resultProgress }}>
        <path d={`M${left} ${front}H${right}L${right + SHEAR} ${back}H${left + SHEAR}Z`} fill="#b48a55" />
        <path d={`M${left} ${front}L${left + SHEAR} ${back}V${back + BOARD.thickness}L${left} ${front + BOARD.thickness}Z`} fill="#7a5a33" />
        <rect x={left} y={front} width={right - left} height={BOARD.thickness} fill="#8f6a3e" />
        <path d={`M${left + 20 + along(boardTop)} ${boardTop}H${right - 30 + along(boardTop)}M${left + 40 + along(boardTop + 9)} ${boardTop + 9}H${right - 16 + along(boardTop + 9)}`}
          stroke="#c9a06a" strokeWidth="1.2" opacity="0.6" />
        {pieces.map((piece, k) => <g key={k} className={`cut-piece-${k}`} style={{ transformOrigin: `${piece.x}px ${piece.y}px` }}>
          <g clipPath={`url(#${clip}-piece-${k})`}>{fruit}{face(k)}</g>
        </g>)}
        {bounds.slice(1, 5).map((x, i) => SPRAY.map((_, j) => <circle key={`${i}-${j}`} className={`cut-juice-${i}-${j}`}
          cx={x + LEAN} cy={boardTop - 18} r={j === 1 ? 1.4 : 1.9} fill={strawberry ? "#d3333b" : color} opacity="0" />))}
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
