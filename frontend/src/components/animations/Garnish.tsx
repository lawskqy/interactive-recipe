import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const RIM = /slice|wedge|wheel|twist|peel|lemon|lime|orange|grapefruit|pineapple|cherry|strawberr|berry|apple|peach|cucumber/i;
const SIZE = 34;

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
    const { anchor, openingRadiusY, color, resultColor, subject, piece, source, resultImage, resultProgress } = props;
    const art = piece || source;
    const rim = RIM.test(subject);
    const [x, y] = rim ? [anchor.x + anchor.width / 2 - 6, anchor.y - 4] : [anchor.x + 12, anchor.y + openingRadiusY + 8];
    const garnishPiece = <g transform={`translate(${x} ${y})`} style={{ opacity: 1 - resultProgress }}>
      <g className="garnish-piece" opacity="0">
        <ActionCutout src={art} x={-SIZE / 2} y={-SIZE / 2} width={SIZE} height={SIZE} fallback={rim ? <>
          <circle r="17" fill={color} stroke="#00000030" strokeWidth="1.5" />
          <circle r="13" fill="#fff7e2" opacity="0.35" />
          {[0, 60, 120].map(angle => <path key={angle} d="M-13 0H13" stroke="#fff7e2" strokeWidth="1.3" opacity="0.8"
            transform={`rotate(${angle})`} />)}
        </> : <>
          <path d="M-18 4Q-6 -14 18 -6Q6 12 -18 4Z" fill={color} stroke="#00000030" strokeWidth="1.5" />
          <path d="M-14 3Q2 -3 14 -5" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" />
        </>} />
      </g>
    </g>;
    return <>
      <CupBack {...props} liquid={resultColor}>
        {!rim && <ellipse className="garnish-ripple" cx={x} cy={y + 6} rx="20" ry="4" fill="none" stroke="#fff7e2" strokeWidth="1.5"
          opacity="0" style={{ transformOrigin: `${x}px ${y + 6}px` }} />}
      </CupBack>
      {resultImage}
      {!rim && garnishPiece}
      <CupFront {...props} liquid={resultColor} />
      {rim && garnishPiece}
    </>;
  },
};
export default garnish;
