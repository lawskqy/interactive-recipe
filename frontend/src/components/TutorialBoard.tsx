import { useEffect, useRef, useState } from "react";
import { describeStep, safeManifest, type Recipe, type StepAsset } from "../lib/recipe";
import { loadAsset, plannedVisual } from "../lib/preparation";
import { useRecipePreparation } from "../lib/use-recipe-preparation";
import Canvas from "./Canvas";
export default function TutorialBoard({
  recipe,
  aiConfigured,
  activeStep,
  onStep,
  completed,
  onComplete,
}: {
  recipe: Recipe;
  aiConfigured: boolean;
  activeStep: number;
  onStep: (index: number) => void;
  completed: number[];
  onComplete: () => void;
}) {
  const [manifest, setManifest] = useState<Record<string, string>>({});
  const [library, setLibrary] = useState<Record<string, StepAsset>>({});
  const libraryCache = useRef<Record<string, StepAsset>>({});
  const { results, assets, plan, progress, error, preparing, stopped, waiting, cancel, retry } = useRecipePreparation(recipe, aiConfigured, activeStep);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/asset-manifest.json", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : {}))
      .then((value) => setManifest(safeManifest(value)))
      .catch(() => {
        /* Text labels remain available without artwork. */
      });
    return () => controller.abort();
  }, []);
  const proposed = plan ? plannedVisual(plan, activeStep, manifest, assets, results) : describeStep(recipe, activeStep, manifest);
  const pendingLibrary = JSON.stringify([...new Set([...proposed.ingredients, ...proposed.tools]
    .filter((asset) => asset.src && !asset.segmented).map((asset) => asset.src!))]);
  useEffect(() => {
    const controller = new AbortController();
    // Keep every candidate hidden while its pixels are checked or segmented.
    void (async () => {
      for (const src of JSON.parse(pendingLibrary) as string[]) {
        if (libraryCache.current[src]) continue;
        const ready = await loadAsset({ name: "Ingredient or tool", src }, controller.signal);
        if (!controller.signal.aborted) {
          libraryCache.current[src] = ready;
          setLibrary((old) => ({ ...old, [src]: ready }));
        }
      }
    })().catch(() => { /* Aborted checks keep their placeholders. */ });
    return () => controller.abort();
  }, [pendingLibrary]);
  const checked = (asset: StepAsset): StepAsset => asset.segmented ? asset :
    { ...asset, src: asset.src ? library[asset.src]?.src : undefined, segmented: !!(asset.src && library[asset.src]?.segmented) };
  const local = { ...proposed, ingredients: proposed.ingredients.map(checked), tools: proposed.tools.map(checked) };
  return (
    <section className="tutorial-panel" aria-label="Step-by-step tutorial">
      <div className="tutorial-top">
        <span className="eyebrow">LET’S MAKE SOMETHING LOVELY</span>
        <span className="step-counter">
          Step {activeStep + 1} of {recipe.steps.length}
        </span>
      </div>
      <div className="step-progress" aria-label="Choose a step">
        {recipe.steps.map((_, i) => (
          <button
            key={i}
            aria-label={`Step ${i + 1}`}
            aria-current={i === activeStep ? "step" : undefined}
            className={completed.includes(i) ? "visited-step" : ""}
            onClick={() => onStep(i)}
          />
        ))}
      </div>
      <h2 className="current-instruction" aria-live="polite" tabIndex={-1}>
        {recipe.steps[activeStep]}
      </h2>
      <Canvas
        key={`${activeStep}:${results[activeStep]?.result || "local"}`}
        visual={results[activeStep] || local}
        instruction={recipe.steps[activeStep]}
        illustrating={waiting}
      />
      {preparing && (
        <div className="preparation-progress">
          <p role="status">{progress?.message || "Preparing your recipe illustrations…"}</p>
          {!!progress?.total && <progress value={progress.completed} max={progress.total} aria-label="Recipe steps illustrated" />}
          <p className="ai-note">{results[activeStep] ? "Preparing the remaining steps in the background." : "The animation will start when this step’s artwork is ready."}</p>
          <button onClick={cancel}>Stop preparing illustrations</button>
        </div>
      )}
      {error && <div className="notice" role="alert">{error}<button onClick={retry}>Retry illustrations</button></div>}
      {stopped && !error && <div className="generation-row"><span>Illustration preparation paused.</span><button onClick={retry}>Resume illustrations</button></div>}
      <nav className="step-navigation" aria-label="Recipe steps">
        <button aria-pressed={completed.includes(activeStep)} onClick={onComplete}>{completed.includes(activeStep) ? "Step completed" : "Mark step complete"}</button>
        <button
          disabled={activeStep === 0}
          onClick={() => onStep(activeStep - 1)}
        >
          ← Previous
        </button>
        {activeStep < recipe.steps.length - 1 ? (
          <button
            className="primary-button"
            onClick={() => onStep(activeStep + 1)}
          >
            Next step →
          </button>
        ) : (
          <span className="completion-message">{completed.length === recipe.steps.length ? "Your cup is ready. Enjoy ♡" : `${completed.length} of ${recipe.steps.length} steps completed`}</span>
        )}
      </nav>
    </section>
  );
}
