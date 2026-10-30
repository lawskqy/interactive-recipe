import { stagger } from "animejs";
import ActionCutout from "../ActionCutout";
import { BowlBack, BowlFront } from "./Bowl";
import { BOWL, type ActionAnimation } from "./types";

const whisk: ActionAnimation = {
  caption: "Whisk until smooth",
  anchor: BOWL,
  container: /bowl/i,
  implement: /\bwhisk\b/i,
  motion(tl) {
    tl.add(".whisk-motion", { y: [-18, 0], duration: 500 }, 0);
    for (let i = 0; i < 10; i++) {
      tl.add(".whisk-motion", { x: [-13, 13, -13], rotate: [-9, 9, -9], duration: 340 }, 500 + i * 340);
    }
    tl.add(".whisk-motion", { x: 0, rotate: 0, y: -10, duration: 650 }, 3900);
    tl.add(".mixture-ripple", { opacity: [0, 0.8], duration: 500 }, 500);
    for (let i = 0; i < 6; i++) {
      tl.add(".mixture-ripple", { scaleX: [0.8, 1.12, 0.8], duration: 550 }, 600 + i * 550);
    }
    tl.add(".mixture-ripple", { opacity: 0, duration: 500 }, 4000);
    tl.add(".whisk-foam", { opacity: [0, 0.7], delay: stagger(70), duration: 1200 }, 1700);
    tl.add(".whisk-motion", { y: -38, opacity: 0, duration: 600 }, 4000);
  },
  Scene(props) {
    const { clip, implement, resultImage, resultProgress, color } = props;
    return <>
      <BowlBack {...props} contents={color} />
      {resultImage}
      <g clipPath={`url(#${clip}-surface)`} style={{ opacity: 1 - resultProgress }}>
        <g className="mixture-ripple" fill="none" stroke="#f5edda" strokeWidth="2" opacity="0">
          <ellipse cx="180" cy="194" rx="47" ry="9" /><path d="M124 191Q179 167 237 192" />
        </g>
        <g className="whisk-foam" fill="#f9f2dc" opacity="0">
          {[0, 1, 2, 3, 4, 5].map(i => <circle key={i} cx={145 + i * 14} cy={193 + (i % 2) * 6} r={2 + i % 3} />)}
        </g>
      </g>
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="whisk-motion">
          <ActionCutout src={implement} x={148} y={60} width={64} height={140} tool fallback={<>
            <path d="M180 62V130" stroke="#b8955c" strokeWidth="12" strokeLinecap="round" />
            <path d="M176 62V121" stroke="#e2c995" strokeWidth="3" strokeLinecap="round" />
            <g fill="none" stroke="#c5a878" strokeWidth="2.5">
              <path d="M176 126C137 168 149 191 180 195C211 191 223 168 184 126" />
              <path d="M178 126C160 161 160 190 180 195C200 190 200 161 182 126" />
              <path d="M180 126V195" />
            </g>
          </>} />
        </g>
      </g>
      <BowlFront {...props} />
    </>;
  },
};
export default whisk;
