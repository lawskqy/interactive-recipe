import { api, mediaUrl } from "./api";
import type { StepAsset, StepVisual } from "./recipe";

interface PlannedObject { id: string; name: string; appearance: string; sourceStep?: number }
export interface PreparationPlan {
  ingredients: PlannedObject[];
  tools: PlannedObject[];
  steps: { index: number; inputs: string[]; tools: string[]; actions: string[]; outputs: PlannedObject[] }[];
}
export interface PreparationJob {
  id: string;
  status: "planning" | "rendering" | "complete" | "error" | "cancelled";
  message: string;
  completed: number;
  total: number;
  plan?: PreparationPlan;
  visuals: Record<number, StepVisual>;
  warnings: string[];
  error?: string;
}

export function plannedVisual(plan: PreparationPlan, index: number): StepVisual {
  const objects = new Map([...plan.ingredients, ...plan.tools, ...plan.steps.flatMap((step) => step.outputs)]
    .map((item) => [item.id, item]));
  const step = plan.steps[index];
  return {
    ingredients: step.inputs.map((id) => objects.get(id)!),
    tools: step.tools.map((id) => objects.get(id)!),
    actions: step.actions,
  };
}

export function pausePolling(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = window.setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 1000);
    signal.addEventListener("abort", abort, { once: true });
  });
}

function loadImage(src: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const image = new Image();
    const finish = (error?: unknown) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
      if (error) { image.src = ""; reject(error); }
      else resolve();
    };
    const abort = () => finish(signal.reason);
    const timer = window.setTimeout(() => finish(new Error("The illustration could not be loaded. Please retry.")), 15000);
    image.onload = () => finish();
    image.onerror = () => finish(new Error("The illustration could not be loaded. Please retry."));
    signal.addEventListener("abort", abort, { once: true });
    image.src = src;
  });
}

export async function loadVisual(visual: StepVisual, signal: AbortSignal): Promise<StepVisual> {
  if (!visual.result) throw new Error("The preparation returned no result artwork.");
  const convert = (asset: StepAsset) => ({ ...asset, src: asset.src ? mediaUrl(asset.src) : undefined });
  const result = mediaUrl(visual.result);
  const ingredients = visual.ingredients.map(convert);
  const tools = visual.tools.map(convert);
  const outputs = visual.outputs?.map(convert);
  // Missing object artwork retains its text label. A missing result is recoverable
  // through Retry rather than playing a transformation into an empty canvas.
  await Promise.all([loadImage(result, signal), ...[...ingredients, ...tools, ...(outputs || [])].map(async (asset) => {
    if (!asset.src || asset.src === result) return;
    try { await loadImage(asset.src, signal); }
    catch (error) { if (signal.aborted) throw error; asset.src = undefined; }
  })]);
  return { ...visual, ingredients, tools, outputs, result };
}

export function cancelPreparation(id: string) {
  return api(`preparations/${id}/cancel`, {}).catch(() => {
    // Unobserved server jobs also stop between tasks after their polling lease expires.
  });
}
