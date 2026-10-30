import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const isGreen = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return g > r && g > b;
};

const garnish: ActionAnimation = {
  caption: "Finish with a garnish",
  anchor: CUP,
  container: /cup|mug|glass/i,
  motion(tl) {
    tl.add(".garnish-piece", { y: [-150, -100, -50, 0], x: [-20, 18, -14, 0], rotate: [-40, 25, -15, 0], opacity: [0, 1, 1, 1],
      duration: 2600, ease: "outSine" }, 300);
    tl.add(".garnish-piece", { y: [0, 3, 0], duration: 700 }, 2950);
    tl.add(".garnish-ripple", { scale: [0.3, 1.3], opacity: [0, 0.6, 0], duration: 900 }, 2850);
  },
  Scene(props) {
    const { color, resultColor, resultImage } = props;
    const leaf = isGreen(color);
    const [x, y] = leaf ? [222, 178] : [246, 160];
    return <>
      <CupBack {...props} liquid={resultColor}>
        {leaf && <ellipse className="garnish-ripple" cx="222" cy="184" rx="20" ry="4" fill="none" stroke="#fff7e2" strokeWidth="1.5"
          opacity="0" style={{ transformOrigin: "222px 184px" }} />}
      </CupBack>
      {resultImage}
      <g transform={`translate(${x} ${y})`}>
        <g className="garnish-piece" opacity="0">
          {leaf ? <>
            <path d="M-18 4Q-6 -14 18 -6Q6 12 -18 4Z" fill={color} stroke="#00000030" strokeWidth="1.5" />
            <path d="M-14 3Q2 -3 14 -5" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" />
          </> : <>
            <circle r="17" fill={color} stroke="#00000030" strokeWidth="1.5" />
            <circle r="13" fill="#fff7e2" opacity="0.35" />
            {[0, 60, 120].map(angle => <path key={angle} d="M-13 0H13" stroke="#fff7e2" strokeWidth="1.3" opacity="0.8"
              transform={`rotate(${angle})`} />)}
          </>}
        </g>
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default garnish;
