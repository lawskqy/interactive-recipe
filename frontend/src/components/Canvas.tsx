import { useEffect, useRef, useState } from "react";
import type { StepVisual } from "../lib/recipe";
import StepTransformation from "./StepTransformation";
import CookingActionScene from "./CookingActionScene";
import { ACTION_DURATION, cookingActions, sceneFor, type ActionCue } from "../lib/cooking-actions";
import "../styles/canvas.css";
export default function Canvas({
  visual,
  instruction,
  cues: planned,
  illustrating = false,
}: {
  visual: StepVisual;
  instruction: string;
  // Planner actions in order; keyword matching is the offline fallback.
  cues?: ActionCue[];
  illustrating?: boolean;
}) {
  const sequence = planned ?? cookingActions(instruction);
  // Only actions with a drawn scene play; the sequence still lists them all.
  const cues = sequence.filter((item) => sceneFor(item.kind));
  const duration = cues.length ? cues.length * ACTION_DURATION + 1000 : 6000;
  const [playing, setPlaying] = useState(
    () => !!visual.result && !!visual.resultSegmented && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [failedResult, setFailedResult] = useState<string | null>(null);
  const hasResult = !!visual.result && !!visual.resultSegmented && failedResult !== visual.result;
  const [elapsed, setElapsed] = useState(0);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const elapsedRef = useRef(0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => {
      setReduced(media.matches);
      if (media.matches) setPlaying(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!playing || reduced) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // A frame timestamp can precede performance.now() from the effect.
      const delta = Math.max(0, Math.min(now - last, 100));
      last = now;
      elapsedRef.current = Math.min(duration, elapsedRef.current + delta);
      setElapsed(elapsedRef.current);
      if (elapsedRef.current < duration) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced, duration]);
  const action =
    visual.actions.find((a) =>
      ["pour", "whisk", "froth", "stir", "heat", "chill", "steep"].includes(a),
    ) || "prepare";
  const complete = elapsed >= duration;
  const cueIndex = Math.max(0, Math.min(cues.length - 1, Math.floor(elapsed / ACTION_DURATION)));
  const cue = cues[cueIndex];
  const transforming = hasResult && !reduced && !complete && (playing || elapsed > 0);
  const blendStart = cue ? (cues.length - 1) * ACTION_DURATION + 900 : 1800;
  const blendDuration = cue ? ACTION_DURATION - 900 : 2800;
  const blend = Math.max(0, Math.min(1, (elapsed - blendStart) / blendDuration));
  const reveal = transforming
    ? blend * blend * (3 - 2 * blend)
    : 1;
  return (
    <div className="visual-board">
      <div
        className="step-assets"
        role="group"
        aria-label="Ingredients, preparations and tools used in this step"
      >
        {[...visual.ingredients, ...visual.tools].map((item, index) => (
          <div className="step-asset" key={item.name + index}>
            {item.src && item.segmented ? (
              <img
                src={item.src}
                alt=""
                width="144"
                height="144"
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
              />
            ) : (
              <span className="asset-placeholder" aria-hidden="true">
                ✧
              </span>
            )}
            <span>{item.name}</span>
            {item.sourceStep !== undefined && <small className="preparation-source">From step {item.sourceStep + 1}</small>}
          </div>
        ))}
      </div>
      <div className="illustration-stage">
        {cue ? (
          <CookingActionScene key={cueIndex} cue={cue}
            visual={hasResult ? visual : { ...visual, result: undefined, resultSegmented: false }}
            elapsed={reduced ? 0 : elapsed - cueIndex * ACTION_DURATION} playing={playing && !reduced}
            resultProgress={hasResult ? reveal : 0}
            onResultError={() => { setFailedResult(visual.result || null); setPlaying(false); elapsedRef.current = 0; setElapsed(0); }} />
        ) : hasResult ? (
          <figure>
            <div className="transformation-stage">
              <img
                className="generated-result"
                src={visual.result}
                style={{ opacity: reveal }}
                onError={() => {
                  setFailedResult(visual.result || null);
                  setPlaying(false);
                  elapsedRef.current = 0;
                  setElapsed(0);
                }}
                alt={`Illustrated result: ${instruction}`}
              />
              {transforming && !cue && (
                <StepTransformation
                  assets={[...visual.ingredients, ...visual.tools].map((asset) => asset.segmented ? asset : { ...asset, src: undefined })}
                  elapsed={elapsed}
                />
              )}
            </div>
          </figure>
        ) : elapsed > 0 && !complete && !reduced ? (
          <div
            className={`action-scene action-${action} ${playing ? "is-playing" : ""}`}
            role="img"
            aria-label={`Illustration of the ${action} action`}
          >
            <svg viewBox="0 0 320 250" aria-hidden="true">
              <ellipse cx="160" cy="219" rx="101" ry="9" fill="#241c17" />
              <path
                d="M94 92h132l-13 110q-53 23-106 0z"
                fill="#e6d7bc"
                stroke="#c5a16a"
                strokeWidth="3"
              />
              <path d="M105 131h109l-8 67q-46 14-92 0z" fill="#8e9d72" />
              <ellipse cx="160" cy="131" rx="53" ry="9" fill="#b7c496" />
              <path
                d="M227 106q59-5 35 55q-11 22-43 14"
                fill="none"
                stroke="#e6d7bc"
                strokeWidth="12"
              />
              <g className="stir-tool">
                <path
                  d="M166 151l20-117"
                  stroke="#c5a16a"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <ellipse
                  cx="167"
                  cy="143"
                  rx="13"
                  ry="24"
                  fill="none"
                  stroke="#c5a16a"
                  strokeWidth="3"
                />
              </g>
              <g className="pour-stream">
                <path
                  d="M133 17q-25 42 15 103"
                  stroke="#c5a16a"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
              <g
                className="steam-lines"
                stroke="#d9c8aa"
                strokeWidth="3"
                fill="none"
              >
                <path d="M133 74q-15-17 0-32t0-30" />
                <path d="M160 72q-15-17 0-32t0-30" />
              </g>
            </svg>
            <p>
              {action === "prepare"
                ? "One small step at a time"
                : action.charAt(0).toUpperCase() + action.slice(1) + " gently"}
            </p>
          </div>
        ) : (
          <div className="result-placeholder" role="status">
            <span aria-hidden="true">✧</span>
            <p>{illustrating ? "Preparing a transparent illustration…" : "Your step illustration will appear here"}</p>
          </div>
        )}
      </div>
      {sequence.length > 1 && <ol className="action-sequence" aria-label="Actions in this step">
        {sequence.map((item, index) => <li key={index} aria-current={item === cue ? "step" : undefined}>{item.kind.replace("-", " ")}</li>)}
      </ol>}
      {!!visual.outputs && visual.outputs.length > 1 && <div className="step-assets" role="group" aria-label="Preparations made in this step">
        {visual.outputs.map((output) => <div className="step-asset" key={output.id}>
          {output.src && output.segmented ? <img src={output.src} alt="" /> : <span className="asset-placeholder" aria-hidden="true">✧</span>}
          <span>{output.name}</span>
        </div>)}
      </div>}
      <div className="animation-controls">
        {!reduced && (
          <>
            <button
              disabled={illustrating && !hasResult}
              onClick={() => {
                if (complete) {
                  elapsedRef.current = 0;
                  setElapsed(0);
                }
                setPlaying((p) => !p);
              }}
            >
              {illustrating && !hasResult ? "Preparing illustration…" : playing
                ? "Pause"
                : elapsed > 0 && !complete
                  ? "Resume"
                  : hasResult
                    ? "Replay transformation"
                    : complete && cue ? "Replay illustration" : "Play illustration"}
            </button>
            <button
              disabled={illustrating && !hasResult}
              onClick={() => {
                elapsedRef.current = 0;
                setElapsed(0);
                setPlaying(false);
              }}
            >
              Reset
            </button>
          </>
        )}
        <span>
          {reduced
            ? "Still view · reduced motion"
            : "Action demonstration, not a cooking timer"}
        </span>
      </div>
    </div>
  );
}
