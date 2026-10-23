import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { Recipe, StepAsset, StepVisual } from "./recipe";
import { cancelPreparation, loadAsset, loadVisual, pausePolling, type PreparationJob, type PreparationPlan } from "./preparation";

export function useRecipePreparation(recipe: Recipe, enabled: boolean, activeStep: number) {
  const [results, setResults] = useState<Record<number, StepVisual>>({});
  const [assets, setAssets] = useState<Record<string, StepAsset>>({});
  const [plan, setPlan] = useState<PreparationPlan | null>(null);
  const [progress, setProgress] = useState<PreparationJob | null>(null);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [request, setRequest] = useState({ attempt: 0, firstStep: activeStep });
  const cancelCurrent = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const id = crypto.randomUUID();
    let started = false, finished = false, cancelled = false;
    const cancel = () => {
      controller.abort();
      if (started && !finished && !cancelled) { cancelled = true; void cancelPreparation(id); }
    };
    cancelCurrent.current = cancel;
    setPreparing(true); setStopped(false); setError(""); setProgress(null);
    void (async () => {
      // StrictMode's first cleanup runs before any paid request is submitted.
      await Promise.resolve();
      controller.signal.throwIfAborted();
      started = true;
      let job = await api<PreparationJob>("preparations", { recipe, index: request.firstStep, id, scope: "recipe" }, controller.signal);
      const loadedSteps = new Map<number, string>();
      const loadedAssets = new Map<string, string>();
      while (!controller.signal.aborted) {
        if (job.plan) setPlan(job.plan);
        setProgress(job);
        await Promise.all(Object.entries(job.assets || {}).map(async ([assetId, asset]) => {
          if (!asset.src || loadedAssets.get(assetId) === asset.src) return;
          const ready = await loadAsset(asset, controller.signal);
          if (controller.signal.aborted) return;
          if (ready.src) setAssets(old => ({ ...old, [assetId]: ready }));
          loadedAssets.set(assetId, asset.src!);
        }));
        for (const [step, visual] of Object.entries(job.visuals)) {
          const index = Number(step);
          if (loadedSteps.get(index) === visual.result) continue;
          const ready = await loadVisual(visual, controller.signal);
          if (controller.signal.aborted) return;
          setResults(old => ({ ...old, [index]: ready }));
          loadedSteps.set(index, visual.result!);
        }
        if (job.status === "error") throw new Error(job.error || job.message);
        if (job.status === "cancelled") { finished = true; setStopped(true); break; }
        if (job.status === "complete") {
          finished = true;
          if (loadedSteps.size !== recipe.steps.length) throw new Error("Some recipe illustrations are missing. Please retry.");
          break;
        }
        await pausePolling(controller.signal);
        job = await api<PreparationJob>(`preparations/${id}`, undefined, controller.signal);
      }
    })().catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setError(error instanceof Error ? error.message : "The recipe illustrations could not be prepared.");
        setPreparing(false);
        cancel();
      }
    }).finally(() => { if (!controller.signal.aborted) setPreparing(false); });
    return () => { cancel(); cancelCurrent.current = null; };
  }, [recipe, enabled, request]);

  return { results, assets, plan, progress, error, preparing, stopped,
    waiting: enabled && !results[activeStep] && !error && !stopped,
    cancel: () => { cancelCurrent.current?.(); setPreparing(false); setStopped(true); },
    retry: () => setRequest(old => ({ attempt: old.attempt + 1, firstStep: activeStep })),
  };
}
