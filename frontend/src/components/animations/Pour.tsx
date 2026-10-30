import ActionCutout from "../ActionCutout";
import ActionVessel from "../ActionVessel";
import type { ActionAnimation } from "./types";

const pour: ActionAnimation = {
  caption: "Pour in a steady stream",
  anchor: { x: 205, y: 166, width: 96, radiusY: 8 },
  container: /cup|glass|mug/i,
  motion(tl) {
    tl.add(".pitcher-motion", { rotate: [0, 32], duration: 850 }, 150);
    tl.add(".liquid-stream", { scaleY: [0, 1], opacity: [0, 0.85], duration: 450 }, 800);
    tl.add(".cup-liquid", { y: [55, 0], duration: 2600, ease: "linear" }, 1000);
    for (let i = 0; i < 5; i++) {
      tl.add(".pour-ripple", { scaleX: [0.65, 1.12, 0.65], opacity: [0.3, 0.8, 0.3], duration: 500 }, 1100 + i * 500);
    }
    tl.add(".liquid-stream", { scaleX: 0, opacity: 0, duration: 350 }, 3600);
    tl.add(".pitcher-motion", { rotate: 0, duration: 700 }, 3800);
    tl.add(".pitcher-motion", { opacity: 0, duration: 300 }, 4500);
  },
  Scene({ clip, anchor, color, receiver, source, resultImage, resultProgress }) {
    return <>
      <g className="receiver-content" style={{ opacity: 1 - resultProgress }}>
        <ActionVessel src={receiver} anchor={anchor} fallback={<>
          <path d="M253 180Q288 174 278 209Q275 224 249 222" fill="none" stroke="#b9aa8e" strokeWidth="6" />
          <path d="M157 166H253L242 244Q205 256 168 244Z" fill="#eee4ce" fillOpacity="0.12" stroke="#b9aa8e" strokeWidth="2" />
          <g clipPath={`url(#${clip})`}>
            <g className="cup-liquid">
              <path d="M152 185Q205 170 259 185V258H152Z" fill={color} />
              <ellipse cx="205" cy="185" rx="49" ry="10" fill="#fff7e2" opacity="0.3" />
              <ellipse className="pour-ripple" cx="205" cy="185" rx="28" ry="5" fill="none" stroke="#fff7e2" strokeWidth="2" />
            </g>
          </g>
          <path d="M174 180L181 237" fill="none" stroke="#fff9eb" strokeWidth="4" opacity="0.55" />
          <ellipse cx="205" cy="166" rx="48" ry="8" fill="none" stroke="#b9aa8e" strokeWidth="2" />
        </>} />
      </g>
      {resultImage}
      <path className="liquid-stream" d="M172 76Q183 101 195 126Q203 148 205 184"
        fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" opacity="0" />
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="pitcher-motion">
          <ActionCutout src={source} x={70} y={49} width={102} height={90} fallback={<>
            <path d="M89 68Q53 58 58 95Q59 112 85 112" fill="none" stroke="#b9aa8e" strokeWidth="7" />
            <path d="M87 49H154L172 76L151 72L145 127Q115 139 86 125Z" fill="#e9ddc4" stroke="#b59b73" strokeWidth="2" />
            <path d="M96 80H146L140 122Q116 130 95 120Z" fill={color} />
            <path d="M99 57V73" stroke="#fff8e6" strokeWidth="4" strokeLinecap="round" />
          </>} />
        </g>
      </g>
    </>;
  },
};
export default pour;
