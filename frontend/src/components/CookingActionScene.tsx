import { useEffect, useId, useRef } from "react";
import { createScope, createTimeline, stagger } from "animejs";
import { ACTION_DURATION, ingredientColor, type ActionCue } from "../lib/cooking-actions";
import type { StepVisual } from "../lib/recipe";
import ActionCutout from "./ActionCutout";
import ActionVessel from "./ActionVessel";
import { useCutoutLayout } from "../lib/cutout-layout";
import "../styles/cooking-actions.css";

const captions = {
  whisk: "Whisk until smooth",
  sift: "Sift gently into the bowl",
  pour: "Pour in a steady stream",
};

export default function CookingActionScene({ cue, elapsed, playing, visual, resultProgress = 0, onResultError }: {
  cue: ActionCue; elapsed: number; playing: boolean; visual?: StepVisual;
  resultProgress?: number; onResultError?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<ReturnType<typeof createTimeline> | null>(null);
  const clip = useId().replace(/:/g, "");
  const color = ingredientColor(cue.context);
  const tools = visual?.tools.filter(asset => asset.src && asset.segmented) || [];
  const ingredients = visual?.ingredients.filter(asset => asset.src && asset.segmented) || [];
  const implement = tools.find(asset => (cue.kind === "whisk" ? /\bwhisk\b/i : /sifter|sieve|strainer/i).test(asset.name));
  const sourceText = cue.context.split(/\b(?:into|over|onto)\b/)[0];
  const source = ingredients.find(asset => sourceText.includes(asset.name.toLowerCase())) ||
    ingredients.find(asset => /milk|water|cream|coffee|espresso|mixture|tea/i.test(asset.name) &&
      asset.name.toLowerCase().split(/\s+/).some(word => word.length > 2 && sourceText.includes(word)));
  const pitcher = source || tools.find(asset => /pitcher|jug|measuring cup/i.test(asset.name));
  const vessel = tools.find(asset => (cue.kind === "pour" ? /cup|glass|mug/i : /bowl/i).test(asset.name));
  // Keep the empty vessel underneath the result as its contents develop.
  const receiver = vessel?.src;
  const receiverLayout = useCutoutLayout(receiver);
  const anchor = cue.kind === "pour"
    ? { x: 205, y: 166, width: 96, radiusY: 8 }
    : { x: 180, y: 193, width: 182, radiusY: 22 };
  const openingRadiusY = receiverLayout
    ? receiverLayout.opening.radiusY * anchor.width / receiverLayout.opening.width
    : anchor.radiusY;
  const result = visual?.resultSegmented ? visual.result : undefined;
  const resultLayout = useCutoutLayout(result);
  const vesselBottom = (layout: typeof receiverLayout) => layout
    ? anchor.y + (layout.bottom - layout.opening.y) * anchor.width / layout.opening.width : 255;
  const ground = Math.max(vesselBottom(receiverLayout), result ? vesselBottom(resultLayout) : 255) + 4;
  const resultImage = <ActionVessel id={`${clip}-result`} src={result} anchor={anchor}
    result opacity={resultProgress} onError={onResultError} />;
  useEffect(() => {
    const scope = createScope({ root }).add(() => {
      const tl = createTimeline({ autoplay: false, defaults: { ease: "inOutSine" } });
      timeline.current = tl;
      if (cue.kind === "whisk") {
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
      } else if (cue.kind === "sift") {
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
      } else {
        tl.add(".pitcher-motion", { rotate: [0, 32], duration: 850 }, 150);
        tl.add(".liquid-stream", { scaleY: [0, 1], opacity: [0, 0.85], duration: 450 }, 800);
        tl.add(".cup-liquid", { y: [55, 0], duration: 2600, ease: "linear" }, 1000);
        for (let i = 0; i < 5; i++) {
          tl.add(".pour-ripple", { scaleX: [0.65, 1.12, 0.65], opacity: [0.3, 0.8, 0.3], duration: 500 }, 1100 + i * 500);
        }
        tl.add(".liquid-stream", { scaleX: 0, opacity: 0, duration: 350 }, 3600);
        tl.add(".pitcher-motion", { rotate: 0, duration: 700 }, 3800);
        tl.add(".pitcher-motion", { opacity: 0, duration: 300 }, 4500);
      }
      // One shared clock in Canvas drives every scene, pause, reset and reveal.
      tl.add({ duration: ACTION_DURATION }, 0);
      // Render every delayed track once so the initial and reset poses agree.
      tl.seek(ACTION_DURATION, true);
      tl.seek(0, true);
    });
    return () => { timeline.current = null; scope.revert(); };
  }, [cue.kind]);
  useEffect(() => { timeline.current?.seek(Math.min(elapsed, ACTION_DURATION), true); }, [elapsed, cue.kind]);

  return (
    <div ref={root} className={`cooking-scene action-scene ${playing ? "is-playing" : ""}`}
      data-action={cue.kind} data-result-progress={resultProgress} role="img"
      aria-label={result && resultProgress === 1 ? `Illustrated result: ${visual?.resultName || cue.context}` : `${cue.kind} demonstration`}>
      <svg viewBox={`0 0 360 ${Math.max(320, ground + 16)}`} aria-hidden="true">
        <defs>
          <clipPath id={clip}><path d="M157 166H253L242 244Q205 256 168 244Z" /></clipPath>
          <clipPath id={`${clip}-surface`}><ellipse cx={anchor.x} cy={anchor.y}
            rx={anchor.width * 0.41} ry={openingRadiusY * 0.62} /></clipPath>
          <clipPath id={`${clip}-front`}><rect x="0" y={anchor.y + openingRadiusY * 0.32} width="360" height="200" /></clipPath>
        </defs>
        <ellipse cx={anchor.x} cy={ground} rx={anchor.width * 0.6} ry="8" fill="#b9a081" opacity="0.12" />
        <g className="action-content">
        {cue.kind !== "pour" ? <>
          <g className="receiver-content" style={{ opacity: 1 - resultProgress }}>
          <ActionVessel src={receiver} anchor={anchor} fallback={<>
          <path d="M89 193Q98 255 180 255Q262 255 271 193Z" fill="#ddd0b6" stroke="#b89a70" strokeWidth="2" />
          <ellipse cx="180" cy="193" rx="91" ry="25" fill="#f5edda" stroke="#b89a70" strokeWidth="2" />
          <ellipse cx="180" cy="194" rx="75" ry="17" fill={cue.kind === "whisk" ? color : "#e8dbc1"} />
          </>} />
          </g>
          {resultImage}
          {cue.kind === "whisk" ? <>
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
              <ActionCutout src={implement?.src} x={148} y={60} width={64} height={140} tool fallback={<>
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
          </> : <>
            <g className="contents-mask" clipPath={`url(#${clip}-surface)`} style={{ opacity: 1 - resultProgress }}>
              <ellipse className="powder-pile" cx={anchor.x} cy={anchor.y}
                rx={anchor.width * 0.4} ry={openingRadiusY * 0.6} fill={color} opacity="0" />
            </g>
            <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
            <g className="sieve-motion">
              <ActionCutout src={implement?.src} x={122} y={86} width={181} height={57} fallback={<>
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
          </>}
          <g className="vessel-front" clipPath={`url(#${clip}-front)`}>
          <g style={{ opacity: 1 - resultProgress }}>
          <ActionVessel src={receiver} anchor={anchor} fallback={<>
          <path d="M89 193Q95 215 180 218Q265 215 271 193Q262 255 180 255Q98 255 89 193Z"
            fill="#ddd0b6" stroke="#b89a70" strokeWidth="2" />
          <path d="M115 224Q180 250 245 224" fill="none" stroke="#f7efdd" strokeWidth="3" opacity="0.6" />
          </>} />
          </g>
          {result && <use href={`#${clip}-result`} />}
          </g>
        </> : <>
          <g className="receiver-content" style={{ opacity: 1 - resultProgress }}>
          <ActionVessel src={receiver} anchor={anchor} fallback={<>
          <path d="M253 180Q288 174 278 209Q275 224 249 222" fill="none" stroke="#b9aa8e" strokeWidth="6" />
          <path d="M157 166H253L242 244Q205 256 168 244Z" fill="#eee4ce" fillOpacity="0.12" stroke="#b9aa8e" strokeWidth="2" />
          <g clipPath={`url(#${clip})`}>
            <g className="cup-liquid">
              <path d="M152 185Q205 170 259 185V258H152Z" fill={color} />
              <ellipse cx="205" cy="185" rx="49" ry="10" fill="#fff7e2" opacity="0.3" />
              <ellipse className="pour-ripple" cx="205" cy="185" rx="28" ry="5" fill="none" stroke="#fff7e2" strokeWidth="2" />
            </g>
          </g>
          <path d="M174 180L181 237" fill="none" stroke="#fff9eb" strokeWidth="4" opacity="0.55" />
          <ellipse cx="205" cy="166" rx="48" ry="8" fill="none" stroke="#b9aa8e" strokeWidth="2" />
          </>} />
          </g>
          {resultImage}
          <path className="liquid-stream" d="M172 76Q183 101 195 126Q203 148 205 184"
            fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" opacity="0" />
          <g className="action-implement" visibility={resultProgress === 1 ? "hidden" : "visible"}>
          <g className="pitcher-motion">
            <ActionCutout src={pitcher?.src} x={70} y={49} width={102} height={90} fallback={<>
            <path d="M89 68Q53 58 58 95Q59 112 85 112" fill="none" stroke="#b9aa8e" strokeWidth="7" />
            <path d="M87 49H154L172 76L151 72L145 127Q115 139 86 125Z" fill="#e9ddc4" stroke="#b59b73" strokeWidth="2" />
            <path d="M96 80H146L140 122Q116 130 95 120Z" fill={color} />
            <path d="M99 57V73" stroke="#fff8e6" strokeWidth="4" strokeLinecap="round" />
            </>} />
          </g>
          </g>
        </>}
        </g>
      </svg>
      <p>{result && resultProgress === 1 ? visual?.resultName || "Step ready" : captions[cue.kind]}</p>
    </div>
  );
}
