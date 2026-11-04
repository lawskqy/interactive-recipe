import { useEffect, useId, useMemo, useRef } from "react";
import { createScope, createTimeline } from "animejs";
import { ACTION_DURATION, ingredientColor, type ActionCue } from "../lib/cooking-actions";
import type { StepAsset, StepVisual } from "../lib/recipe";
import ActionVessel from "./ActionVessel";
import { animations } from "./animations";
import { halfWidthAt, useCutoutLayout } from "../lib/cutout-layout";
import { stageFrame } from "../lib/stage-frame";
import "../styles/cooking-actions.css";

export default function CookingActionScene({ cue, elapsed, playing, visual, resultProgress = 0, onResultError, holder }: {
  cue: ActionCue; elapsed: number; playing: boolean; visual?: StepVisual;
  resultProgress?: number; onResultError?: () => void; holder?: StepAsset;
}) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<ReturnType<typeof createTimeline> | null>(null);
  const clip = useId().replace(/:/g, "");
  const animation = animations[cue.kind] || animations.pour!;
  const { anchor, Scene } = animation;
  const color = cue.color || ingredientColor(cue.context);
  const tools = visual?.tools.filter(asset => asset.src && asset.segmented) || [];
  const ingredients = visual?.ingredients.filter(asset => asset.src && asset.segmented) || [];
  const byId = (assets: StepAsset[], id?: string) => id ? assets.find(asset => asset.id === id) : undefined;
  const implement = byId(tools, cue.tool) || (animation.implement && tools.find(asset => animation.implement!.test(asset.name)));
  const sourceText = cue.context.split(/\b(?:into|over|onto)\b/)[0];
  const source = cue.items?.map(id => byId(ingredients, id)).find(Boolean) ||
    ingredients.find(asset => sourceText.includes(asset.name.toLowerCase())) ||
    ingredients.find(asset => /milk|water|cream|coffee|espresso|mixture|tea/i.test(asset.name) &&
      asset.name.toLowerCase().split(/\s+/).some(word => word.length > 2 && sourceText.includes(word))) ||
    tools.find(asset => /pitcher|jug|measuring cup/i.test(asset.name));
  // A container that is an earlier preparation is shown as the tool holding it.
  const vessel = byId(tools, cue.container) || holder || tools.find(asset => animation.container.test(asset.name));
  // Keep the empty vessel underneath the result as its contents develop.
  const receiver = vessel?.src;
  const receiverLayout = useCutoutLayout(receiver);
  const openingRadiusY = receiverLayout
    ? receiverLayout.opening.radiusY * anchor.width / receiverLayout.opening.width
    : anchor.radiusY;
  const result = visual?.resultSegmented ? visual.result : undefined;
  const resultLayout = useCutoutLayout(result);
  const vesselBottom = (layout: typeof receiverLayout) => layout
    ? anchor.y + (layout.bottom - layout.opening.y) * anchor.width / layout.opening.width : 255;
  const ground = Math.max(vesselBottom(receiverLayout), result ? vesselBottom(resultLayout) : 255) + 4;
  // Leave room for the base of the glass so pieces rest inside it.
  const floor = receiverLayout ? anchor.y + (vesselBottom(receiverLayout) - anchor.y) * 0.9 : undefined;
  const frame = receiverLayout ? stageFrame(receiverLayout, anchor) : undefined;
  const insideAt = useMemo(() => {
    if (!receiverLayout) return undefined;
    const scale = anchor.width / receiverLayout.opening.width;
    // Outer silhouette less the drawn wall and its outline.
    return (y: number) => halfWidthAt(receiverLayout, receiverLayout.opening.y + (y - anchor.y) / scale) * scale * 0.86;
  }, [receiverLayout, anchor]);
  const resultImage = <ActionVessel id={`${clip}-result`} src={result} anchor={anchor} match={receiver}
    result opacity={resultProgress} onError={onResultError} />;
  useEffect(() => {
    const scope = createScope({ root }).add(() => {
      const tl = createTimeline({ autoplay: false, defaults: { ease: "inOutSine" } });
      timeline.current = tl;
      animation.motion(tl, { anchor, openingRadiusY, floor, insideAt });
      // One shared clock in Canvas drives every scene, pause, reset and reveal.
      tl.add({ duration: ACTION_DURATION }, 0);
      // Render every delayed track once so the initial and reset poses agree.
      tl.seek(ACTION_DURATION, true);
      tl.seek(0, true);
    });
    return () => { timeline.current = null; scope.revert(); };
  }, [animation, anchor, openingRadiusY, floor, insideAt]);
  useEffect(() => { timeline.current?.seek(Math.min(elapsed, ACTION_DURATION), true); }, [elapsed, animation, insideAt]);

  return (
    <div ref={root} className={`cooking-scene action-scene ${playing ? "is-playing" : ""}`}
      data-action={cue.kind} data-result-progress={resultProgress} role="img"
      aria-label={result && resultProgress === 1 ? `Illustrated result: ${visual?.resultName || cue.context}` : `${cue.kind} demonstration`}>
      <svg viewBox={frame ? `${frame.x} ${frame.y} ${frame.width} ${frame.height}` : `0 0 360 ${Math.max(320, ground + 16)}`}
        aria-hidden="true">
        <defs>
          <clipPath id={clip}><path d="M157 166H253L242 244Q205 256 168 244Z" /></clipPath>
          <clipPath id={`${clip}-surface`}><ellipse cx={anchor.x} cy={anchor.y}
            rx={anchor.width * 0.41} ry={openingRadiusY * 0.62} /></clipPath>
          <clipPath id={`${clip}-front`}><rect x="-2000" y={anchor.y + openingRadiusY * 0.32} width="4360" height="4000" /></clipPath>
        </defs>
        <ellipse cx={anchor.x} cy={ground} rx={anchor.width * 0.6} ry="8" fill="#b9a081" opacity="0.12" />
        <g className="action-content">
          <Scene clip={clip} anchor={anchor} openingRadiusY={openingRadiusY} floor={floor} color={color}
            resultColor={cue.resultColor || color} receiver={receiver}
            implement={implement?.src} source={source?.src} result={result} resultImage={resultImage}
            resultProgress={resultProgress} insideAt={insideAt} />
        </g>
      </svg>
      <p>{result && resultProgress === 1 ? visual?.resultName || "Step ready" : animation.caption}</p>
    </div>
  );
}
