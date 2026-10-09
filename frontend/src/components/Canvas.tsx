import { useEffect, useRef, useState } from "react";
import type { Recipe, StepVisual } from "../lib/recipe";
import RecipeCover from "./RecipeCover";
import StepTransformation from "./StepTransformation";
import "../styles/canvas.css";
export default function Canvas({
  visual,
  recipe,
  instruction,
}: {
  visual: StepVisual;
  recipe: Recipe;
  instruction: string;
}) {
  const [playing, setPlaying] = useState(
    () => !!visual.result && !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [failedResult, setFailedResult] = useState<string | null>(null);
  const hasResult = !!visual.result && failedResult !== visual.result;
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
      const delta = Math.min(now - last, 100);
      last = now;
      elapsedRef.current = Math.min(6000, elapsedRef.current + delta);
      setElapsed(elapsedRef.current);
      if (elapsedRef.current < 6000) frame = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced]);
  const action =
    visual.actions.find((a) =>
      ["pour", "whisk", "froth", "stir", "heat", "chill", "steep"].includes(a),
    ) || "prepare";
  const complete = elapsed >= 6000;
  const transforming = hasResult && !reduced && !complete && (playing || elapsed > 0);
  const reveal = transforming
    ? 1 - (1 - Math.max(0, Math.min(1, (elapsed - 3100) / 1500))) ** 3
    : 1;
  return (
    <div className="visual-board">
      <div
        className="step-assets"
        aria-label="Ingredients, preparations and tools used in this step"
      >
        {[...visual.ingredients, ...visual.tools].map((item, index) => (
          <div className="step-asset" key={item.name + index}>
            {item.src ? (
              <img
                src={item.src}
                alt=""
                width="68"
                height="68"
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
        {hasResult ? (
          <figure>
            <div className="transformation-stage">
              <img
                className="generated-result"
                src={visual.result}
                style={{ opacity: reveal, transform: `scale(${0.86 + reveal * 0.14})` }}
                onError={() => {
                  setFailedResult(visual.result || null);
                  setPlaying(false);
                  elapsedRef.current = 0;
                  setElapsed(0);
                }}
                alt={`Illustrated result: ${instruction}`}
              />
              {transforming && (
                <StepTransformation
                  assets={[...visual.ingredients, ...visual.tools]}
                  elapsed={elapsed}
                />
              )}
            </div>
            <figcaption>
              {transforming && elapsed < 3100
                ? "Bringing this step together…"
                : visual.resultName || "AI illustration of this step"}
            </figcaption>
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
          <figure>
            <RecipeCover
              className="cover-preview"
              recipe={recipe}
              alt="The finished drink, for inspiration"
            />
            <figcaption>
              {complete
                ? "Ready for the next step?"
                : "Your finished cup, for inspiration"}
            </figcaption>
          </figure>
        )}
      </div>
      {!!visual.outputs && visual.outputs.length > 1 && <div className="step-assets" aria-label="Preparations made in this step">
        {visual.outputs.map((output) => <div className="step-asset" key={output.id}>
          {output.src && <img src={output.src} alt="" />}
          <span>{output.name}</span>
        </div>)}
      </div>}
      <div className="animation-controls">
        {!reduced && (
          <>
            <button
              onClick={() => {
                if (complete) {
                  elapsedRef.current = 0;
                  setElapsed(0);
                }
                setPlaying((p) => !p);
              }}
            >
              {playing
                ? "Pause"
                : elapsed > 0 && !complete
                  ? "Resume"
                  : hasResult
                    ? "Replay transformation"
                    : "Play illustration"}
            </button>
            <button
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
