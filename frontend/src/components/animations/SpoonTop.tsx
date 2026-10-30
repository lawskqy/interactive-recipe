import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const spoonTop: ActionAnimation = {
  caption: "Spoon it gently on top",
  anchor: CUP,
  container: /cup|mug|glass/i,
  implement: /spoon|piping|whipped cream/i,
  motion(tl) {
    for (let i = 0; i < 2; i++) {
      const start = 200 + i * 1900;
      tl.add(".top-spoon", { x: [-80, 0], y: [-20, 0], opacity: [0, 1], duration: 700 }, start);
      tl.add(".top-dollop", { x: [-80, 0], y: [-20, 0], opacity: [0, 1], duration: 700 }, start);
      tl.add(".top-spoon", { rotate: [0, 50], duration: 500 }, start + 800);
      tl.add(".top-dollop", { y: [0, 52], opacity: [1, 0], duration: 450, ease: "inQuad" }, start + 900);
      tl.add(`.top-mound-${i}`, { scale: [0, 1], opacity: [0, 1], duration: 500, ease: "outBack" }, start + 1300);
      tl.add(".top-spoon", { rotate: 0, x: 80, opacity: 0, duration: 500 }, start + 1400);
    }
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={resultColor} />
      {resultImage}
      {[0, 1].map(i => <path key={i} className={`top-mound-${i}`} opacity="0"
        d={i ? "M186 182Q192 164 210 168Q230 164 232 182Z" : "M164 184Q172 170 188 174Q208 166 246 184Z"}
        fill={color} stroke="#00000014" style={{ transformOrigin: `${i ? 209 : 205}px 183px` }} />)}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="top-spoon" style={{ transformOrigin: "204px 124px" }}>
          <ActionCutout src={implement} x={100} y={104} width={120} height={36} fallback={<>
            <path d="M104 120L188 124" stroke="#c5a16a" strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="204" cy="125" rx="17" ry="8" fill="#d8bd8a" stroke="#b89a70" strokeWidth="2" />
          </>} />
        </g>
        <path className="top-dollop" d="M190 122Q194 106 205 110Q218 104 220 122Z" fill={color} opacity="0" />
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default spoonTop;
