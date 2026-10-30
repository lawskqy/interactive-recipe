import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const pieces = [[180, 236], [198, 240], [216, 238], [232, 234], [190, 226], [208, 228], [224, 224]];

const mash: ActionAnimation = {
  caption: "Press gently to release the juice",
  anchor: CUP,
  container: /glass|cup|mug|shaker|bowl/i,
  implement: /muddler|masher|pestle|spoon|fork/i,
  motion(tl) {
    tl.add(".cup-liquid", { y: [70, 70], duration: 1 }, 0);
    tl.add(".mash-tool", { y: [-70, 0], opacity: [0, 1], duration: 600 }, 0);
    for (let i = 0; i < 4; i++) {
      tl.add(".mash-tool", { y: [0, 24, 0], duration: 650 }, 700 + i * 700);
      tl.add(".mash-piece", { scaleY: 1 - (i + 1) * 0.15, scaleX: 1 + (i + 1) * 0.08, duration: 250 }, 900 + i * 700);
    }
    tl.add(".cup-liquid", { y: [70, 44], duration: 2800 }, 900);
    tl.add(".mash-tool", { y: -70, opacity: 0, duration: 600 }, 3900);
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={resultColor} />
      {resultImage}
      {pieces.map(([cx, cy], i) => <ellipse key={i} className="mash-piece" cx={cx} cy={cy} rx="9" ry="8" fill={color}
        stroke="#00000026" strokeWidth="1.5" style={{ transformBox: "fill-box", transformOrigin: "center bottom" }} />)}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="mash-tool">
          <ActionCutout src={implement} x={186} y={36} width={40} height={180} tool fallback={<>
            <rect x="200" y="40" width="12" height="160" rx="6" fill="#b8955c" stroke="#94744a" strokeWidth="1.5" />
            <rect x="194" y="196" width="24" height="18" rx="7" fill="#a5844f" stroke="#94744a" strokeWidth="1.5" />
          </>} />
        </g>
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default mash;
