import pour from "./Pour";
import type { ActionAnimation } from "./types";

const layer: ActionAnimation = {
  ...pour,
  caption: "Pour slowly so it floats on top",
  motion(tl) {
    tl.add(".pitcher-motion", { rotate: [0, 22], duration: 1100 }, 150);
    tl.add(".liquid-stream", { scaleY: [0, 1], scaleX: [0.5, 0.5], opacity: [0, 0.75], duration: 600 }, 1000);
    tl.add(".cup-liquid", { y: [55, 35], duration: 2400, ease: "linear" }, 1200);
    for (let i = 0; i < 4; i++) {
      tl.add(".pour-ripple", { scaleX: [0.8, 1, 0.8], opacity: [0.2, 0.5, 0.2], duration: 600 }, 1300 + i * 600);
    }
    tl.add(".liquid-stream", { scaleX: 0, opacity: 0, duration: 350 }, 3700);
    tl.add(".pitcher-motion", { rotate: 0, duration: 700 }, 3900);
    tl.add(".pitcher-motion", { opacity: 0, duration: 300 }, 4500);
  },
};
export default layer;
