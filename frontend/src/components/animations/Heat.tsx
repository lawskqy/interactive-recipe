import { stagger } from "animejs";
import { Burner, PanBack } from "./Pan";
import { PAN, type ActionAnimation } from "./types";

const heat: ActionAnimation = {
  caption: "Warm gently until steaming",
  anchor: PAN,
  container: /saucepan|pan|pot|jug|kettle/i,
  motion(tl) {
    for (let i = 0; i < 12; i++) {
      tl.add(".burner-flame", { scaleY: [0.85, 1.1, 0.85], duration: 360 }, 200 + i * 360);
    }
    tl.add(".heat-shimmer", { opacity: [0, 0.6, 0], scaleX: [0.7, 1, 0.7], delay: stagger(500), duration: 1400 }, 900);
    tl.add(".heat-steam", { y: [10, -40], opacity: [0, 0.75, 0], delay: stagger(450), duration: 1800 }, 1500);
  },
  Scene(props) {
    const { color, resultImage } = props;
    return <>
      <Burner />
      <PanBack {...props} liquid={color}>
        {[0, 1].map(i => <ellipse key={i} className="heat-shimmer" cx="180" cy="184" rx={50 - i * 18} ry={7 - i * 2}
          fill="none" stroke="#fff7e2" strokeWidth="1.5" opacity="0" style={{ transformOrigin: "180px 184px" }} />)}
      </PanBack>
      {resultImage}
      <g fill="none" stroke="#e8dcc6" strokeWidth="3" strokeLinecap="round">
        {[150, 180, 210].map(x => <path key={x} className="heat-steam" opacity="0"
          d={`M${x} 170q-10-14 0-28t0-28`} />)}
      </g>
    </>;
  },
};
export default heat;
