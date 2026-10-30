import ActionVessel from "../ActionVessel";
import type { ActionAnimation } from "./types";

const blend: ActionAnimation = {
  caption: "Blend until smooth",
  anchor: { x: 205, y: 72, width: 90, radiusY: 6 },
  container: /blender/i,
  motion(tl) {
    tl.add(".blend-light", { opacity: [0.2, 1], duration: 300 }, 300);
    for (let i = 0; i < 32; i++) {
      tl.add(".blend-body", { x: [-1.2, 1.2, -1.2], duration: 100 }, 500 + i * 100);
    }
    for (let i = 0; i < 10; i++) {
      tl.add(".blend-vortex", { scaleX: [1, 0.3, 1], duration: 320 }, 600 + i * 320);
    }
    tl.add(".blend-chunk", { scale: [1, 0], rotate: [0, 180], duration: 1600 }, 700);
    tl.add(".blend-smooth", { opacity: [0, 1], duration: 2200 }, 900);
    tl.add(".blend-vortex", { opacity: [0.8, 0], duration: 500 }, 3700);
    tl.add(".blend-light", { opacity: 0.2, duration: 300 }, 3800);
  },
  Scene({ clip, anchor, color, resultColor, receiver, resultImage, resultProgress }) {
    return <>
      <defs><clipPath id={`${clip}-jar`}><path d="M162 74H248L239 198H171Z" /></clipPath></defs>
      <g className="blend-body">
        <g className="receiver-content" style={{ opacity: 1 - resultProgress }}>
          <ActionVessel src={receiver} anchor={anchor} fallback={<>
            <path d="M154 200H256L262 252H148Z" fill="#5c4a3d" stroke="#3f3129" strokeWidth="2" />
            <circle className="blend-light" cx="205" cy="228" r="7" fill="#e9a04b" opacity="0.2" />
            <path d="M160 72H250L240 200H170Z" fill="#eee4ce" fillOpacity="0.15" stroke="#b9aa8e" strokeWidth="2" />
            <g clipPath={`url(#${clip}-jar)`}>
              <path d="M150 120Q205 110 260 120V210H150Z" fill={color} />
              {[[182, 182], [204, 190], [226, 178], [194, 160], [218, 156], [204, 136]].map(([cx, cy], i) =>
                <circle key={i} className="blend-chunk" cx={cx} cy={cy} r={9 - i % 2 * 2} fill={color}
                  stroke="#00000026" strokeWidth="1.5" style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}
              <path className="blend-smooth" d="M150 120Q205 110 260 120V210H150Z" fill={resultColor} opacity="0" />
              <g className="blend-vortex" fill="none" stroke="#fff7e2" strokeWidth="2" opacity="0.8" style={{ transformOrigin: "205px 160px" }}>
                <ellipse cx="205" cy="132" rx="30" ry="6" /><ellipse cx="205" cy="160" rx="20" ry="5" /><ellipse cx="205" cy="184" rx="10" ry="3" />
              </g>
            </g>
            <rect x="156" y="60" width="98" height="14" rx="5" fill="#5c4a3d" stroke="#3f3129" strokeWidth="2" />
            <path d="M180 82L184 190" stroke="#fff9eb" strokeWidth="4" opacity="0.4" />
          </>} />
        </g>
      </g>
      {resultImage}
    </>;
  },
};
export default blend;
