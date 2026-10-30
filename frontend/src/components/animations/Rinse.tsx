import { stagger } from "animejs";
import { BowlBack, BowlFront } from "./Bowl";
import { BOWL, type ActionAnimation } from "./types";

const fruit = [[150, 190], [176, 196], [204, 192], [228, 197], [164, 180], [192, 178], [216, 182]];

const rinse: ActionAnimation = {
  caption: "Rinse under cold water",
  anchor: BOWL,
  container: /colander|bowl|sieve|strainer/i,
  motion(tl) {
    tl.add(".rinse-stream", { scaleY: [0, 1], opacity: [0, 0.8], duration: 500 }, 300);
    for (let i = 0; i < 8; i++) {
      tl.add(".rinse-fruit", { y: [0, -3, 0], rotate: [0, i % 2 ? 8 : -8, 0], delay: stagger(40), duration: 380 }, 800 + i * 380);
    }
    for (let wave = 0; wave < 4; wave++) {
      tl.add(".rinse-splash", { y: [0, -18, 6], opacity: [0, 1, 0], delay: stagger(50, { from: "center" }), duration: 600 },
        800 + wave * 700);
      tl.add(".rinse-drip", { y: [0, 30], opacity: [0, 1, 0], delay: stagger(80), duration: 500, ease: "inQuad" }, 1000 + wave * 700);
    }
    tl.add(".rinse-stream", { scaleY: 0, opacity: 0, duration: 400 }, 3700);
  },
  Scene(props) {
    const { color, resultImage, resultProgress } = props;
    return <>
      <BowlBack {...props} contents="#d9cdb4" />
      {resultImage}
      <g style={{ opacity: 1 - resultProgress }}>
        {fruit.map(([cx, cy], i) => <g key={i} className="rinse-fruit" style={{ transformOrigin: `${cx}px ${cy + 10}px` }}>
          <circle cx={cx} cy={cy} r="12" fill={color} stroke="#00000026" strokeWidth="1.5" />
          <circle cx={cx - 4} cy={cy - 4} r="2.5" fill="#ffffff" opacity="0.55" />
        </g>)}
      </g>
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <path d="M96 34H178Q196 34 196 52V62" fill="none" stroke="#b9b4ac" strokeWidth="12" strokeLinecap="round" />
        <rect x="186" y="58" width="20" height="10" rx="3" fill="#8f8a83" />
        <path className="rinse-stream" d="M196 68V180" stroke="#a9d0d6" strokeWidth="7" strokeLinecap="round" opacity="0"
          style={{ transformOrigin: "196px 68px" }} />
        {[166, 178, 188, 204, 214, 226].map(cx => <circle key={cx} className="rinse-splash" cx={cx} cy={176 + Math.abs(cx - 196) / 5}
          r="2.5" fill="#bfe0e4" opacity="0" />)}
      </g>
      <BowlFront {...props} />
      <g fill="#5c4a3d" opacity="0.55" style={{ opacity: 0.55 * (1 - resultProgress) }}>
        {[130, 155, 180, 205, 230].map(cx => <circle key={cx} cx={cx} cy={cx === 130 || cx === 230 ? 226 : 236} r="2.5" />)}
      </g>
      {[150, 180, 210].map(cx => <circle key={cx} className="rinse-drip" cx={cx} cy="252" r="2.2" fill="#a9d0d6" opacity="0" />)}
    </>;
  },
};
export default rinse;
