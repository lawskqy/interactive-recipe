import { CupBack, CupFront } from "./Cup";
import PourPitcher from "./PourPitcher";
import { CUP, POUR_LIP as LIP, type ActionAnimation, type SceneGeometry } from "./types";

const SWAY = [0, 5, 2, 7, 3, 6];
const SPLASH = [[-13, 9], [-6, 15], [1, 19], [8, 14], [14, 8]];

function surface({ anchor, openingRadiusY, floor }: SceneGeometry) {
  return { low: (floor ?? 240) - 4, high: anchor.y + openingRadiusY + 10 };
}

// A falling stream leaves the lip sideways and bends down into the vessel.
function stream(anchor: SceneGeometry["anchor"], land: number, sway: number) {
  return `M${LIP.x} ${LIP.y}C${LIP.x + 12 + sway} ${LIP.y + 1} ${anchor.x - 5 + sway} ${LIP.y + 28} ${anchor.x + sway * 0.2} ${land}`;
}

const pour: ActionAnimation = {
  caption: "Pour in a steady stream",
  anchor: CUP,
  container: /cup|glass|mug/i,
  motion(tl, geometry) {
    const { low, high } = surface(geometry);
    const level = (t: number) => low + (high - low) * t;
    const streams = ".liquid-stream, .stream-sheen";
    // Lift into place, dip back slightly, then tip forward to start the pour.
    tl.add(".pitcher-enter", { x: [-18, 0], y: [24, 0], duration: 650, ease: "outCubic" }, 0);
    tl.add(".pitcher-motion", { rotate: [0, -5], duration: 250 }, 550);
    tl.add(".pitcher-motion", { rotate: 38, duration: 550, ease: "inOutQuad" }, 800);
    tl.add(streams, { strokeDashoffset: [1, 0], duration: 380, ease: "inQuad" }, 1200);
    tl.add(".liquid-stream", { strokeWidth: [2, 6.5], duration: 380 }, 1200);
    // Keep tipping as the pitcher empties; the stream sways and glugs as it flows.
    tl.add(".pitcher-motion", { rotate: [38, 46, 43, 52], duration: 2200, ease: "inOutSine" }, 1350);
    for (let i = 0; i < SWAY.length - 1; i++) {
      tl.add(streams, { d: [stream(geometry.anchor, level(i / 5), SWAY[i]), stream(geometry.anchor, level((i + 1) / 5), SWAY[i + 1])],
        duration: 440, ease: "inOutSine" }, 1200 + i * 440);
      tl.add(".liquid-stream", { strokeWidth: [6.5, 4.5, 6.5], duration: 440 }, 1580 + i * 440);
    }
    tl.add(".cup-liquid", { y: [55, 0], duration: 2200, ease: "linear" }, 1400);
    tl.add(".pour-surface", { y: [low - high, 0], duration: 2200, ease: "linear" }, 1400);
    for (let i = 0; i < 5; i++) {
      tl.add(".pour-ripple", { scaleX: [0.65, 1.12, 0.65], opacity: [0.3, 0.8, 0.3], duration: 440 }, 1500 + i * 440);
      SPLASH.forEach(([dx, rise], n) => {
        tl.add(`.pour-splash-${n}`, { x: [0, dx], y: [0, -rise], opacity: [0, 0.9], duration: 200, ease: "outQuad" }, 1550 + i * 440 + n * 15);
        tl.add(`.pour-splash-${n}`, { y: 3, opacity: 0, duration: 220, ease: "inQuad" }, 1750 + i * 440 + n * 15);
      });
    }
    // The tail leaves the lip and falls in, a last drop follows, then the pitcher lifts away.
    tl.add(".liquid-stream", { strokeWidth: 3, duration: 300 }, 3500);
    tl.add(streams, { strokeDashoffset: -1, duration: 420, ease: "inQuad" }, 3600);
    tl.add(".pitcher-motion", { rotate: 0, duration: 650, ease: "inOutSine" }, 3700);
    tl.add(".pour-drip", { scale: [0, 1], opacity: [0, 1], duration: 160 }, 3850);
    tl.add(".pour-drip", { y: high - LIP.y, opacity: 0, duration: 380, ease: "inQuad" }, 4050);
    tl.add(".pitcher-enter", { x: -18, y: 24, opacity: 0, duration: 450, ease: "inCubic" }, 4350);
  },
  Scene(props) {
    const { anchor, color, source, resultImage, resultProgress } = props;
    const { low, high } = surface(props);
    return <>
      <CupBack {...props} liquid={color}>
        <ellipse className="pour-ripple" cx="205" cy="185" rx="28" ry="5" fill="none" stroke="#fff7e2" strokeWidth="2" />
      </CupBack>
      {resultImage}
      <g visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <path className="liquid-stream" d={stream(anchor, low, 0)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1}
          fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.9" />
        <path className="stream-sheen" d={stream(anchor, low, 0)} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1}
          fill="none" stroke="#fff8e6" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" transform="translate(-1.5 0)" />
        <g className="pour-surface">
          {SPLASH.map((_, n) => <circle key={n} className={`pour-splash-${n}`} cx={anchor.x} cy={high} r={n % 2 ? 1.6 : 2.2}
            fill={color} opacity="0" />)}
        </g>
        <path className="pour-drip" d={`M${LIP.x} ${LIP.y}q-3 5 0 7q3-2 0-7z`} fill={color} opacity="0"
          style={{ transformOrigin: `${LIP.x}px ${LIP.y}px` }} />
      </g>
      <CupFront {...props} liquid={color} />
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <PourPitcher source={source} color={color} />
      </g>
    </>;
  },
};
export default pour;
