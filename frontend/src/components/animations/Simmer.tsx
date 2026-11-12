import { stagger } from "animejs";
import { Burner, PanBack } from "./Pan";
import { PAN, type ActionAnimation } from "./types";

const bubbles = [[142, 184], [166, 179], [192, 187], [214, 180], [232, 186], [178, 190], [204, 192], [156, 189]];

const simmer: ActionAnimation = {
  caption: "Simmer with small bubbles",
  anchor: PAN,
  container: /saucepan|pan|pot|kettle/i,
  motion(tl) {
    for (let i = 0; i < 16; i++) {
      tl.add(".burner-flame", { scaleY: [0.9, 1.25, 0.9], duration: 280 }, 100 + i * 280);
    }
    for (let wave = 0; wave < 4; wave++) {
      tl.add(".simmer-bubble", { scale: [0, 1, 1.3], opacity: [0, 0.9, 0], delay: stagger(110, { from: "random" }), duration: 700 },
        600 + wave * 900);
    }
    tl.add(".heat-steam", { y: [10, -50], opacity: [0, 0.85, 0], delay: stagger(300), duration: 1500 }, 900);
    tl.add(".heat-steam", { y: [10, -50], opacity: [0, 0.85, 0], delay: stagger(300), duration: 1500 }, 2600);
  },
  Scene(props) {
    const { color, resultImage } = props;
    return <>
      <Burner flame={1.3} />
      <PanBack {...props} liquid={color}>
        {bubbles.map(([cx, cy], i) => <circle key={i} className="simmer-bubble" cx={cx} cy={cy} r={4 + i % 3}
          fill="none" stroke="#fff7e2" strokeWidth="1.5" opacity="0" style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}
      </PanBack>
      {resultImage}
      <g fill="none" stroke="#e8dcc6" strokeWidth="3" strokeLinecap="round">
        {[140, 168, 196, 224].map(x => <path key={x} className="heat-steam" opacity="0" d={`M${x} 168q-10-14 0-28t0-28`} />)}
      </g>
    </>;
  },
};
export default simmer;
