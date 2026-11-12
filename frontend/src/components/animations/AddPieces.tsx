import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { stackOnFloor } from "./reach";
import { CUP, type ActionAnimation, type SceneGeometry } from "./types";
import { tint } from "../../lib/tint";

// [offset from the vessel centre, stack row, tilt]
const pieces = [[-27, 0, 0], [-1, 0, 40], [25, 0, -30], [-15, 1, 70], [13, 1, 15], [-1, 2, -50], [-23, 2, 25]];
// How far above the rim each piece appears before it drops.
const RELEASE = 120;
const GAP = 330;

function resting(scene: SceneGeometry) {
  const { anchor, openingRadiusY } = scene;
  const floor = scene.floor ?? 236;
  const step = Math.max(0, Math.min(16, (floor - 10 - (anchor.y + openingRadiusY + 10)) / 2));
  return stackOnFloor(scene, pieces, floor - 10, step, 14);
}

const SIZE = 26;

// Ingredient art shows a whole serving (a bowl of berries), so each piece uses the generated single-piece
// cutout, or is drawn as one item until that exists; a light rim keeps dark fruit readable.
function single(subject: string, color: string, i: number) {
  const edge = tint(color, 0.5);
  if (/blueberr/i.test(subject)) return <>
    <circle r="10" fill="#3f4f8f" stroke="#8d9bd0" strokeWidth="1.5" />
    <circle r="10" fill="#c9d3f0" opacity="0.18" />
    <path d="M0 -10L2 -7L5 -8L3 -5L0 -6L-3 -5L-5 -8L-2 -7Z" fill="#2a3360" />
    <ellipse cx="-4" cy="2" rx="2.5" ry="3.5" fill="#ffffff" opacity="0.35" />
  </>;
  if (/strawberr/i.test(subject)) return <>
    <path d="M0 12C-9 8 -12 -2 -10 -6C-6 -9 6 -9 10 -6C12 -2 9 8 0 12Z" fill="#d3333b" stroke="#f08a8f" strokeWidth="1.5" />
    {[[-4, -2], [3, -3], [0, 3], [-5, 5], [5, 4]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="0.9" ry="1.4" fill="#f4d46a" />)}
    <path d="M-9 -7L-4 -11L0 -8L4 -11L9 -7L4 -6L0 -9L-4 -6Z" fill="#5d9a3a" />
  </>;
  if (/raspberr|blackberr|berr|grape|cherr/i.test(subject)) return <>
    <circle r="10" fill={color} stroke={edge} strokeWidth="1.5" />
    <ellipse cx="-4" cy="-4" rx="2.5" ry="3.5" fill="#ffffff" opacity="0.4" />
  </>;
  if (/mint|basil|leaf|leaves|herb/i.test(subject)) return <>
    <path d="M-12 4C-8 -8 6 -11 12 -4C6 8 -6 10 -12 4Z" fill="#5f9e46" stroke="#a6d38c" strokeWidth="1.5" />
    <path d="M-10 3L10 -4" stroke="#3f6f2c" strokeWidth="1.2" />
  </>;
  if (/lemon|lime|orange|citrus|grapefruit/i.test(subject)) return <>
    <path d="M-12 3A12 12 0 0 1 12 3Z" fill={color} stroke={tint(color, -0.25)} strokeWidth="2" />
    <path d="M-8 2A8 8 0 0 1 8 2Z" fill={tint(color, 0.45)} />
    {[-50, -90, -130].map(a => <path key={a} d={`M0 2L${8 * Math.cos(a * Math.PI / 180)} ${2 + 8 * Math.sin(a * Math.PI / 180)}`} stroke={tint(color, -0.1)} strokeWidth="1" />)}
  </>;
  if (i % 2) return <rect x="-10" y="-9" width="20" height="18" rx="4" fill={color} stroke={edge} strokeWidth="2" />;
  return <path d="M-11 6L-6 -9L10 -6L11 7Z" fill={color} stroke={edge} strokeWidth="2" strokeLinejoin="round" />;
}

const addPieces: ActionAnimation = {
  caption: "Add the pieces",
  anchor: CUP,
  container: /glass|cup|mug|shaker|bowl|blender|jug|saucepan/i,
  motion(tl, geometry) {
    const top = geometry.anchor.y - RELEASE;
    // Each piece makes one fall from above the rim all the way to its resting place, under gravity, then settles.
    resting(geometry).forEach(([, y], i) => {
      const at = 300 + i * GAP;
      const fall = Math.round(170 + Math.sqrt(y - top) * 34);
      tl.add(`.piece-drop-${i}`, { opacity: [0, 1], duration: 150 }, at);
      tl.add(`.piece-drop-${i}`, { y: [
        { from: top - y, to: top - y, duration: 150 },
        { to: 0, duration: fall, ease: "inQuad" },
        { to: -5, duration: 90, ease: "outQuad" },
        { to: 0, duration: 110, ease: "inQuad" },
      ] }, at);
      tl.add(`.piece-drop-${i}`, { rotate: [-60, 0], duration: 150 + fall, ease: "linear" }, at);
    });
  },
  Scene(props) {
    const { color, piece, subject, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} />
      {resultImage}
      <g style={{ opacity: 1 - resultProgress }}>
        {resting(props).map(([x, y, angle], i) => <g key={i} transform={`translate(${x} ${y})`}>
          <g className={`piece-drop-${i}`} opacity="0">
            <g transform={`rotate(${angle})`}>
              <ActionCutout src={piece} x={-SIZE / 2} y={-SIZE / 2} width={SIZE} height={SIZE}
                fallback={<g transform={`scale(${SIZE / 24})`}>{single(subject, color, i)}</g>} />
            </g>
          </g>
        </g>)}
      </g>
      <CupFront {...props} />
    </>;
  },
};
export default addPieces;
