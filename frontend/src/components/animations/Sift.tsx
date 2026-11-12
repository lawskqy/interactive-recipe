import { stagger } from "animejs";
import ActionCutout from "../ActionCutout";
import { BowlBack, BowlFront } from "./Bowl";
import { BOWL, type ActionAnimation } from "./types";

const sift: ActionAnimation = {
  caption: "Sift gently into the bowl",
  anchor: BOWL,
  container: /bowl/i,
  implement: /sifter|sieve|strainer/i,
  motion(tl) {
    for (let i = 0; i < 10; i++) {
      tl.add(".sieve-motion", { x: [-7, 7, -7], rotate: [-2, 2, -2], duration: 340 }, 400 + i * 340);
    }
    tl.add(".sieve-motion", { x: 0, rotate: 0, duration: 400 }, 3800);
    for (let wave = 0; wave < 5; wave++) {
      tl.add(".powder-grain", { y: [0, 70], opacity: [0, 1, 1, 0],
        duration: 650, delay: stagger(22), ease: "inQuad" }, 500 + wave * 620);
    }
    tl.add(".powder-pile", { scaleX: [0.15, 1], scaleY: [0.1, 1], opacity: [0, 1], duration: 3100 }, 650);
    tl.add(".sieve-motion", { y: -24, opacity: 0, duration: 600 }, 4000);
  },
  Scene(props) {
    const { clip, anchor, openingRadiusY, implement, resultImage, resultProgress, color } = props;
    return <>
      <BowlBack {...props} contents="#e8dbc1" />
      {resultImage}
      <g className="contents-mask" clipPath={`url(#${clip}-surface)`} style={{ opacity: 1 - resultProgress }}>
        <ellipse className="powder-pile" cx={anchor.x} cy={anchor.y}
          rx={anchor.width * 0.4} ry={openingRadiusY * 0.6} fill={color} opacity="0" />
      </g>
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="sieve-motion">
          <ActionCutout src={implement} x={122} y={86} width={181} height={57} fallback={<>
            <path d="M233 102H303" stroke="#bd9e68" strokeWidth="10" strokeLinecap="round" />
            <path d="M122 101Q128 142 177 143Q226 142 232 101Z" fill="#d5c8a9" fillOpacity="0.55" stroke="#b99e70" strokeWidth="2" />
            {[0, 1, 2, 3, 4, 5, 6].map(i => <path key={i} d={`M${132 + i * 15} 105L${143 + i * 11} 136`} stroke="#af9c79" strokeWidth="1" />)}
            <path d="M130 115H225M140 128H215" stroke="#af9c79" strokeWidth="1" />
            <ellipse cx="177" cy="101" rx="56" ry="15" fill="#eee3ca" stroke="#b99e70" strokeWidth="3" />
            <ellipse cx="177" cy="102" rx="43" ry="9" fill={color} />
          </>} />
        </g>
      </g>
      {Array.from({ length: 18 }, (_, i) => <circle key={i} className="powder-grain"
        cx={146 + (i * 17 % 66)} cy={anchor.y - 70 - i % 4 * 3} r={1.2 + i % 3 * 0.5} fill={color} opacity="0" />)}
      <BowlFront {...props} />
    </>;
  },
};
export default sift;
