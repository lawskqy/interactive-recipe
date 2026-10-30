import { stagger } from "animejs";
import ActionCutout from "../ActionCutout";
import { CUP, type ActionAnimation } from "./types";

const shake: ActionAnimation = {
  caption: "Shake hard until chilled",
  anchor: CUP,
  container: /^$/,
  implement: /shaker/i,
  motion(tl) {
    tl.add(".shake-body", { y: [0, -30], rotate: [0, -20], duration: 500 }, 200);
    for (let i = 0; i < 14; i++) {
      tl.add(".shake-body", { x: [-16, 16, -16], y: [-30, -44, -30], rotate: [-26, -14, -26], duration: 200 }, 700 + i * 200);
    }
    for (let i = 0; i < 6; i++) {
      tl.add(".shake-rattle", { opacity: [0, 0.9, 0], delay: stagger(60), duration: 300 }, 800 + i * 420);
    }
    tl.add(".shake-body", { x: 0, y: 0, rotate: 0, duration: 600 }, 3600);
    tl.add(".shake-frost", { opacity: [0, 0.9], delay: stagger(60), duration: 700 }, 3200);
  },
  Scene({ receiver, implement, resultImage, resultProgress }) {
    return <>
      {resultImage}
      <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
        <g className="shake-body" style={{ transformOrigin: "205px 160px" }}>
          <ActionCutout src={implement || receiver} x={168} y={58} width={74} height={196} fallback={<>
            <rect x="193" y="60" width="24" height="18" rx="4" fill="#b9b4ac" stroke="#8f8a83" strokeWidth="2" />
            <path d="M184 78H226L222 112H188Z" fill="#cfcac2" stroke="#8f8a83" strokeWidth="2" />
            <path d="M182 112H228L236 246Q205 256 174 246Z" fill="#c8c4bd" stroke="#8f8a83" strokeWidth="2" />
            <path d="M178 140H232M180 220H232" stroke="#a8a39b" strokeWidth="2" />
            <path d="M192 120L188 236" stroke="#f2efe9" strokeWidth="4" opacity="0.6" />
            {[[200, 150], [216, 170], [196, 196], [220, 206], [208, 228], [190, 172]].map(([cx, cy], i) =>
              <circle key={i} className="shake-frost" cx={cx} cy={cy} r="2" fill="#f4f8f8" opacity="0" />)}
          </>} />
        </g>
        <g stroke="#e8dcc6" strokeWidth="2.5" strokeLinecap="round">
          {["M150 120l-14-6", "M146 150h-16", "M150 180l-14 6", "M262 118l14-6", "M266 148h16", "M262 178l14 6"].map(d =>
            <path key={d} className="shake-rattle" d={d} opacity="0" />)}
        </g>
      </g>
    </>;
  },
};
export default shake;
