import { stagger } from "animejs";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const sparkles = [[140, 150, 1], [272, 132, 0.8], [150, 214, 0.6], [262, 200, 0.9], [206, 112, 0.7]];

const serve: ActionAnimation = {
  caption: "Ready to enjoy",
  anchor: CUP,
  container: /cup|mug|glass/i,
  motion(tl) {
    tl.add(".serve-saucer", { scaleX: [0.3, 1], opacity: [0, 1], duration: 500 }, 0);
    tl.add(".serve-cup", { x: [150, 0], opacity: [0, 1], duration: 1100, ease: "outCubic" }, 300);
    tl.add(".serve-steam", { y: [6, -34], opacity: [0, 0.8, 0], delay: stagger(350), duration: 1500 }, 1400);
    tl.add(".serve-steam", { y: [6, -34], opacity: [0, 0.8, 0], delay: stagger(350), duration: 1500 }, 2700);
    tl.add(".serve-sparkle", { scale: [0, 1, 0], rotate: [0, 90], opacity: [0, 1, 0], delay: stagger(260), duration: 900 }, 1600);
  },
  Scene(props) {
    const { resultColor, resultImage } = props;
    return <>
      <ellipse className="serve-saucer" cx="205" cy="250" rx="70" ry="10" fill="#e9ddc4" stroke="#b59b73" strokeWidth="2"
        opacity="0" style={{ transformOrigin: "205px 250px" }} />
      <g className="serve-cup" opacity="0">
        <CupBack {...props} liquid={resultColor} />
        {resultImage}
        <CupFront {...props} liquid={resultColor} />
      </g>
      <g fill="none" stroke="#e8dcc6" strokeWidth="2.5" strokeLinecap="round">
        {[190, 220].map(x => <path key={x} className="serve-steam" opacity="0" d={`M${x} 158q-8-10 0-20t0-20`} />)}
      </g>
      {sparkles.map(([x, y, size], i) => <path key={i} className="serve-sparkle" opacity="0" fill="#f2c46d"
        d={`M${x} ${y - 9 * size}L${x + 2.5 * size} ${y}L${x} ${y + 9 * size}L${x - 2.5 * size} ${y}ZM${x - 9 * size} ${y}L${x} ${y - 2.5 * size}L${x + 9 * size} ${y}L${x} ${y + 2.5 * size}Z`}
        style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}
    </>;
  },
};
export default serve;
