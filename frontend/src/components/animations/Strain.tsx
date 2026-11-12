import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import PourPitcher from "./PourPitcher";
import StrainerArt from "./StrainerArt";
import { CUP, POUR_LIP as LIP, STRAINER, type ActionAnimation, type SceneGeometry } from "./types";

const SWAY = [0, 3, 1, 4, 2, 3];
const DEPTH = STRAINER.depth;
const rim = (anchor: SceneGeometry["anchor"]) => anchor.y - STRAINER.lift;

const tip = (anchor: SceneGeometry["anchor"]) => ({ x: anchor.x, y: rim(anchor) + DEPTH + 2 });

function surface({ anchor, openingRadiusY, floor }: SceneGeometry) {
  return { low: (floor ?? 240) - 4, high: anchor.y + openingRadiusY + 14 };
}

function stream(anchor: SceneGeometry["anchor"], sway: number) {
  const land = rim(anchor) + 10;
  return `M${LIP.x} ${LIP.y}C${LIP.x + 9 + sway} ${LIP.y + 1} ${anchor.x - 14 + sway} ${LIP.y + 14} ${anchor.x - 10 + sway * 0.3} ${land}`;
}

const drip = (anchor: SceneGeometry["anchor"], end: number) => {
  const { x, y } = tip(anchor);
  return `M${x} ${y}L${x} ${end}`;
};

const strain: ActionAnimation = {
  caption: "Strain through the sieve",
  anchor: CUP,
  container: /glass|cup|mug|jug|bowl/i,
  implement: /sieve|strainer|sifter|cheesecloth/i,
  motion(tl, geometry) {
    const { anchor } = geometry;
    const { low, high } = surface(geometry);
    const level = (t: number) => low + (high - low) * t;
    const streams = ".strain-stream, .strain-sheen";
    tl.add(".strain-sieve", { y: [-24, 0], opacity: [0, 1], duration: 550, ease: "outCubic" }, 0);
    tl.add(".pitcher-enter", { x: [-18, 0], y: [24, 0], duration: 650, ease: "outCubic" }, 350);
    tl.add(".pitcher-motion", { rotate: [0, -5], duration: 250 }, 900);
    tl.add(".pitcher-motion", { rotate: 38, duration: 550, ease: "inOutQuad" }, 1150);
    tl.add(streams, { strokeDashoffset: [1, 0], duration: 280, ease: "inQuad" }, 1500);
    tl.add(".strain-stream", { strokeWidth: [2, 6], duration: 280 }, 1500);
    tl.add(".pitcher-motion", { rotate: [38, 46, 42, 50], duration: 2000, ease: "inOutSine" }, 1700);
    for (let i = 0; i < SWAY.length - 1; i++) {
      tl.add(streams, { d: [stream(anchor, SWAY[i]), stream(anchor, SWAY[i + 1])], duration: 400, ease: "inOutSine" }, 1500 + i * 400);
    }
    tl.add(".strainer-fill", { translateY: [DEPTH + 6, DEPTH * 0.55], duration: 700, ease: "outQuad" }, 1650);
    tl.add(".strain-solid", { opacity: [0, 1], scale: [0.3, 1], delay: stagger(240), duration: 400 }, 1800);
    tl.add(".strain-drip", { strokeDashoffset: [1, 0], duration: 300, ease: "inQuad" }, 1850);
    tl.add(".strain-drip", { d: [drip(anchor, level(0)), drip(anchor, level(1))], duration: 2100, ease: "linear" }, 1900);
    tl.add(".strain-drip", { strokeWidth: [3, 2.2, 3, 2.4, 3], duration: 2100 }, 1900);
    tl.add(".strain-surface", { y: [low - high, 0], duration: 2100, ease: "linear" }, 1900);
    for (let i = 0; i < 5; i++) {
      tl.add(".strain-ripple", { scaleX: [0.5, 1.1, 0.5], opacity: [0.25, 0.75, 0.25], duration: 420 }, 2000 + i * 420);
    }
    tl.add(".cup-liquid", { y: [55, 0], duration: 2100, ease: "linear" }, 1900);
    tl.add(".strain-stream", { strokeWidth: 3, duration: 250 }, 3550);
    tl.add(streams, { strokeDashoffset: -1, duration: 380, ease: "inQuad" }, 3650);
    tl.add(".pitcher-motion", { rotate: 0, duration: 600, ease: "inOutSine" }, 3700);
    tl.add(".strainer-fill", { translateY: DEPTH + 6, duration: 500, ease: "inQuad" }, 3800);
    tl.add(".strain-drip", { strokeWidth: 1.2, duration: 300 }, 3900);
    tl.add(".strain-drip", { strokeDashoffset: -1, duration: 300, ease: "inQuad" }, 4150);
    tl.add(".strain-ripple", { opacity: 0, duration: 250 }, 4300);
    tl.add(".pitcher-enter", { x: -18, y: 24, opacity: 0, duration: 450, ease: "inCubic" }, 4250);
    tl.add(".strain-sieve", { y: -24, opacity: 0, duration: 500, ease: "inCubic" }, 4400);
  },
  Scene(props) {
    const { anchor, clip, color, resultColor, source, implement, resultImage, resultProgress } = props;
    const { low, high } = surface(props);
    return <>
      <CupBack {...props} liquid={resultColor}>
        <g className="strain-surface">
          <ellipse className="strain-ripple" cx={anchor.x} cy={high} rx="12" ry="2.5" fill="none" stroke="#fff7e2" strokeWidth="1.5"
            opacity="0" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
        </g>
      </CupBack>
      {resultImage}
      <path className="strain-drip" d={drip(anchor, low)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1}
        fill="none" stroke={resultColor} strokeWidth="3" strokeLinecap="round" opacity="0.85"
        visibility={resultProgress === 1 ? "hidden" : "visible"} />
      <CupFront {...props} liquid={resultColor} />
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <path className="strain-stream" d={stream(anchor, 0)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1}
          fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <path className="strain-sheen" d={stream(anchor, 0)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1}
          fill="none" stroke="#fff8e6" strokeWidth="1.1" strokeLinecap="round" opacity="0.4" transform="translate(-1.5 0)" />
        <g className="strain-sieve" opacity="0">
          <StrainerArt src={implement} anchor={anchor} clip={clip} color={color} />
        </g>
        <PourPitcher source={source} color={color} />
      </g>
    </>;
  },
};
export default strain;
