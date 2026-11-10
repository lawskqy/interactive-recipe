import { CupBack, CupFront } from "./Cup";
import PourPitcher from "./PourPitcher";
import { CUP, POUR_LIP as LIP, type ActionAnimation, type SceneGeometry } from "./types";

const SWAY = [0, 5, 2, 7, 3, 6];
const SPLASH = [[-13, 9], [-6, 15], [1, 19], [8, 14], [14, 8]];
const BASE = 0.55;
const BAND = 22;

function surface({ anchor, openingRadiusY, floor }: SceneGeometry) {
  return { low: (floor ?? 240) - 4, high: anchor.y + openingRadiusY + 10 };
}

// A falling stream leaves the lip sideways and bends down into the vessel.
function stream(anchor: SceneGeometry["anchor"], land: number, sway: number) {
  return `M${LIP.x} ${LIP.y}C${LIP.x + 12 + sway} ${LIP.y + 1} ${anchor.x - 5 + sway} ${LIP.y + 28} ${anchor.x + sway * 0.2} ${land}`;
}

export function pouring({ caption, layered }: { caption: string; layered: boolean }): ActionAnimation {
  const width = layered ? 3.6 : 6.5;
  const sway = layered ? SWAY.map(s => s * 0.4) : SWAY;
  const tilt = layered ? [30, 35, 33, 38] : [38, 46, 43, 52];
  return {
    caption,
    anchor: CUP,
    container: /cup|glass|mug/i,
    motion(tl, geometry) {
      const { low, high } = surface(geometry);
      const start = layered ? BASE : 0;
      const level = (t: number) => low + (high - low) * (start + (1 - start) * t);
      const streams = ".liquid-stream, .stream-sheen";
      // Lift into place, dip back slightly, then tip forward to start the pour.
      tl.add(".pitcher-enter", { x: [-18, 0], y: [24, 0], duration: 650, ease: "outCubic" }, 0);
      tl.add(".pitcher-motion", { rotate: [0, -5], duration: 250 }, 550);
      tl.add(".pitcher-motion", { rotate: tilt[0], duration: layered ? 750 : 550, ease: "inOutQuad" }, 800);
      tl.add(streams, { strokeDashoffset: [1, 0], duration: 380, ease: "inQuad" }, 1200);
      tl.add(".liquid-stream", { strokeWidth: [2, width], duration: 380 }, 1200);
      // Keep tipping as the pitcher empties; the stream sways and glugs as it flows.
      tl.add(".pitcher-motion", { rotate: tilt, duration: 2200, ease: "inOutSine" }, 1350);
      for (let i = 0; i < sway.length - 1; i++) {
        tl.add(streams, { d: [stream(geometry.anchor, level(i / 5), sway[i]), stream(geometry.anchor, level((i + 1) / 5), sway[i + 1])],
          duration: 440, ease: "inOutSine" }, 1200 + i * 440);
        tl.add(".liquid-stream", { strokeWidth: [width, width * 0.7, width], duration: 440 }, 1580 + i * 440);
      }
      if (layered) {
        tl.add(".cup-liquid", { y: [BAND + 8, 8], duration: 2200, ease: "linear" }, 1400);
        tl.add(".layer-band", { scaleY: [0, 1], duration: 2200, ease: "linear" }, 1400);
      } else {
        tl.add(".cup-liquid", { y: [55, 0], duration: 2200, ease: "linear" }, 1400);
      }
      tl.add(".pour-surface", { y: [level(0) - high, 0], duration: 2200, ease: "linear" }, 1400);
      for (let i = 0; i < 5; i++) {
        tl.add(".pour-ripple", { scaleX: layered ? [0.8, 1.05, 0.8] : [0.65, 1.12, 0.65], opacity: [0.3, layered ? 0.55 : 0.8, 0.3],
          duration: 440 }, 1500 + i * 440);
        if (!layered) SPLASH.forEach(([dx, rise], n) => {
          tl.add(`.pour-splash-${n}`, { x: [0, dx], y: [0, -rise], opacity: [0, 0.9], duration: 200, ease: "outQuad" }, 1550 + i * 440 + n * 15);
          tl.add(`.pour-splash-${n}`, { y: 3, opacity: 0, duration: 220, ease: "inQuad" }, 1750 + i * 440 + n * 15);
        });
      }
      // The tail leaves the lip and falls in, a last drop follows, then the pitcher lifts away.
      tl.add(".liquid-stream", { strokeWidth: width * 0.45, duration: 300 }, 3500);
      tl.add(streams, { strokeDashoffset: -1, duration: 420, ease: "inQuad" }, 3600);
      tl.add(".pitcher-motion", { rotate: 0, duration: 650, ease: "inOutSine" }, 3700);
      tl.add(".pour-drip", { scale: [0, 1], opacity: [0, 1], duration: 160 }, 3850);
      tl.add(".pour-drip", { y: high - LIP.y, opacity: 0, duration: 380, ease: "inQuad" }, 4050);
      tl.add(".pitcher-enter", { x: -18, y: 24, opacity: 0, duration: 450, ease: "inCubic" }, 4350);
    },
    Scene(props) {
      const { anchor, color, resultColor, source, resultImage, resultProgress } = props;
      const { low, high } = surface(props);
      const base = layered ? resultColor : color;
      return <>
        <CupBack {...props} liquid={base}>
          {layered && <path className="layer-band" d={`M152 185Q205 170 259 185V${185 + BAND}Q205 ${192 + BAND} 152 ${185 + BAND}Z`}
            fill={color} style={{ transformBox: "fill-box", transformOrigin: "center top" }} />}
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
        <CupFront {...props} liquid={layered ? undefined : color} />
        <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
          <PourPitcher source={source} color={color} />
        </g>
      </>;
    },
  };
}

const pour = pouring({ caption: "Pour in a steady stream", layered: false });
export default pour;
