import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { describeStep, safeManifest, type Recipe, type StepVisual } from "../lib/recipe";
import { cancelPreparation, loadVisual, pausePolling, plannedVisual, type PreparationJob, type PreparationPlan } from "../lib/preparation";
import Canvas from "./Canvas";
export default function TutorialBoard({
  recipe,
  activeStep,
  onStep,
  completed,
  onComplete,
}: {
  recipe: Recipe;
  activeStep: number;
  onStep: (index: number) => void;
  completed: number[];
  onComplete: () => void;
}) {
  const [manifest, setManifest] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<number, StepVisual>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [plan, setPlan] = useState<PreparationPlan | null>(null);
  const [progress, setProgress] = useState<PreparationJob | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
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
    setProgress(null);
    return () => {
      request.current?.abort();
    };
  }, [activeStep]);
  const local = plan ? plannedVisual(plan, activeStep) : describeStep(recipe, activeStep, manifest);
  async function generate() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const id = ++requestId.current;
    const index = activeStep;
    const jobId = crypto.randomUUID();
    const cancel = () => { void cancelPreparation(jobId); };
    controller.signal.addEventListener("abort", cancel, { once: true });
    setBusy(index);
    setError(null);
    setWarnings([]);
    setProgress(null);
    try {
      let job = await api<PreparationJob>("preparations", { recipe, index, id: jobId }, controller.signal);
      const loaded = new Set<number>();
      const loggedWarnings = new Set<string>();
      while (!controller.signal.aborted && id === requestId.current) {
        setProgress(job);
        if (job.plan) setPlan(job.plan);
        setWarnings(job.warnings);
        for (const warning of job.warnings) {
          if (!loggedWarnings.has(warning)) {
            console.warn("[Illustration]", warning);
            loggedWarnings.add(warning);
          }
        }
        for (const [step, visual] of Object.entries(job.visuals)) {
          const stepIndex = Number(step);
          if (loaded.has(stepIndex)) continue;
          const ready = await loadVisual(visual, controller.signal);
          if (id !== requestId.current || controller.signal.aborted) return;
          setResults((old) => ({ ...old, [stepIndex]: ready }));
          loaded.add(stepIndex);
        }
        if (job.status === "error") throw new Error(job.error || job.message);
        if (job.status === "cancelled") break;
        if (job.status === "complete") {
          if (!loaded.has(index)) throw new Error("The preparation returned no artwork for this step. Please retry.");
          break;
        }
        await pausePolling(controller.signal);
        job = await api<PreparationJob>(`preparations/${jobId}`, undefined, controller.signal);
      }
    } catch (err) {
      if (id === requestId.current && !controller.signal.aborted) {
        void cancelPreparation(jobId);
        setError({
          index,
          text:
            err instanceof Error
              ? err.message
              : "Unable to illustrate this step.",
        });
      }
    } finally {
      controller.signal.removeEventListener("abort", cancel);
      if (id === requestId.current && !controller.signal.aborted) setBusy(null);
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
        key={`${activeStep}:${results[activeStep]?.result || "local"}`}
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
      {busy === activeStep && (
        <div className="preparation-progress">
          <p role="status">{progress?.message || "Understanding the recipe and its preparations…"}</p>
          {!!progress?.total && <progress value={progress.completed} max={progress.total} aria-label="Preparation steps illustrated" />}
          <p className="ai-note">This can take a few minutes.</p>
          <button onClick={() => { request.current?.abort(); setBusy(null); setProgress(null); }}>Cancel illustration</button>
        </div>
      )}
      {warnings.some((warning) => warning.includes("retry")) && busy === null && <div className="preparation-warnings">
        <button onClick={() => void generate()}>Retry background removal</button>
      </div>}
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
