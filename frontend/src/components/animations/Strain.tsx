import { stagger } from "animejs";
import ActionCutout from "../ActionCutout";
import { CupBack, CupFront } from "./Cup";
import { CUP, type ActionAnimation } from "./types";

const strain: ActionAnimation = {
  caption: "Strain through the sieve",
  anchor: CUP,
  container: /glass|cup|mug|jug|bowl/i,
  implement: /sieve|strainer|sifter|cheesecloth/i,
  motion(tl) {
    tl.add(".strain-sieve", { y: [-40, 0], opacity: [0, 1], duration: 600 }, 0);
    tl.add(".strain-stream", { scaleY: [0, 1], opacity: [0, 0.9], duration: 500 }, 700);
    tl.add(".strain-solid", { opacity: [0, 1], scale: [0.3, 1], delay: stagger(220), duration: 500 }, 1100);
    for (let wave = 0; wave < 5; wave++) {
      tl.add(".strain-drip", { y: [0, 46], opacity: [0, 1, 0], delay: stagger(70), duration: 450, ease: "inQuad" }, 1000 + wave * 480);
    }
    tl.add(".cup-liquid", { y: [55, 14], duration: 2600, ease: "linear" }, 1100);
    tl.add(".strain-stream", { scaleY: 0, opacity: 0, duration: 400 }, 3400);
    tl.add(".strain-sieve", { y: -40, opacity: 0, duration: 600 }, 4100);
  },
  Scene(props) {
    const { color, resultColor, implement, resultImage, resultProgress } = props;
    return <>
      <CupBack {...props} liquid={resultColor} />
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <path className="strain-stream" d="M150 22Q178 40 196 106" fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round" opacity="0" style={{ transformOrigin: "150px 22px" }} />
        {[198, 206, 214].map(x => <circle key={x} className="strain-drip" cx={x} cy="140" r="2.5" fill={resultColor} opacity="0" />)}
        <g className="strain-sieve">
          <ActionCutout src={implement} x={166} y={96} width={140} height={48} fallback={<>
            <path d="M242 108H302" stroke="#bd9e68" strokeWidth="8" strokeLinecap="round" />
            <path d="M168 110Q172 140 205 142Q238 140 242 110Z" fill="#d5c8a9" fillOpacity="0.5" stroke="#b99e70" strokeWidth="2" />
            {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M${176 + i * 14} 114L${182 + i * 10} 136`} stroke="#af9c79" strokeWidth="1" />)}
            <ellipse cx="205" cy="110" rx="37" ry="8" fill="none" stroke="#b99e70" strokeWidth="3" />
          </>} />
          {[[194, 124], [206, 128], [216, 122], [200, 118]].map(([cx, cy], i) => <circle key={i} className="strain-solid"
            cx={cx} cy={cy} r={4 - i % 2} fill={color} stroke="#00000033" opacity="0"
            style={{ transformBox: "fill-box", transformOrigin: "center" }} />)}
        </g>
      </g>
      <CupFront {...props} liquid={resultColor} />
    </>;
  },
};
export default strain;
