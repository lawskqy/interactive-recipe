import { useEffect, useRef, useState } from "react";
import { api, mediaUrl } from "../lib/api";
import { describeStep, safeManifest, type Recipe, type StepVisual } from "../lib/recipe";
import Canvas from "./Canvas";
interface Generated {
  image_path: string;
}
export default function TutorialBoard({
  recipe,
  activeStep,
  onStep,
  completed,
  onComplete,
  availability,
}: {
  recipe: Recipe;
  activeStep: number;
  onStep: (index: number) => void;
  completed: number[];
  onComplete: () => void;
  availability: string;
}) {
  const [manifest, setManifest] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<number, StepVisual>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<{ index: number; text: string } | null>(
    null,
  );
  const request = useRef<AbortController | null>(null);
  const requestId = useRef(0);
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
  useEffect(() => {
    setBusy(null);
    return () => {
      request.current?.abort();
    };
  }, [activeStep]);
  const local = describeStep(recipe, activeStep, manifest);
  async function generate() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const id = ++requestId.current;
    const index = activeStep;
    setBusy(index);
    setError(null);
    try {
      const result = await api<Generated>(
        "generate-result-image",
        {
          step: recipe.steps[index],
          previous: `/images/${recipe.image}`,
          index: index + 1,
          name: recipe.name,
          context: recipe.steps.slice(0, index),
          ingredients: recipe.ingredients,
        },
        controller.signal,
      );
      const src = mediaUrl(result.image_path);
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        const timer = window.setTimeout(() => {
          image.onload = null;
          image.onerror = null;
          reject(
            new Error("The illustration could not be loaded. Please retry."),
          );
        }, 15000);
        image.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        image.onerror = () => {
          clearTimeout(timer);
          reject(
            new Error("The illustration could not be loaded. Please retry."),
          );
        };
        image.src = src;
      });
      if (id === requestId.current && !controller.signal.aborted)
        setResults((old) => ({ ...old, [index]: { ...local, result: src } }));
    } catch (err) {
      if (id === requestId.current && !controller.signal.aborted)
        setError({
          index,
          text:
            err instanceof Error
              ? err.message
              : "Unable to illustrate this step.",
        });
    } finally {
      if (id === requestId.current) setBusy(null);
    }
  }
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
        key={activeStep}
        visual={results[activeStep] || local}
        recipe={recipe}
        instruction={recipe.steps[activeStep]}
      />
      <div className="generation-row">
        <span>Want a closer look at this step?</span>
        <button
          disabled={busy === activeStep || !!results[activeStep]}
          onClick={() => void generate()}
        >
          {busy === activeStep
            ? "Illustrating…"
            : results[activeStep]
              ? "Illustration ready"
              : "Illustrate with AI ✧"}
        </button>
      </div>
      <p className="ai-note">{availability} AI illustrations share the recipe and reference artwork with Google Gemini.</p>
      {error?.index === activeStep && (
        <div className="notice" role="alert">
          {error.text}
          <button onClick={() => void generate()}>Try again</button>
        </div>
      )}
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
