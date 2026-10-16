import { api, mediaUrl } from "./api";
import { canonicalName, type StepAsset, type StepVisual } from "./recipe";

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
  assets?: Record<string, StepAsset>;
  warnings: string[];
  error?: string;
}

export function plannedVisual(
  plan: PreparationPlan,
  index: number,
  manifest: Record<string, string>,
  assets: Record<string, StepAsset>,
  visuals: Record<number, StepVisual>,
): StepVisual {
  const objects = new Map([...plan.ingredients, ...plan.tools, ...plan.steps.flatMap((step) => step.outputs)]
    .map((item) => [item.id, item]));
  const step = plan.steps[index];
  const sources = new Map(plan.steps.flatMap((entry, stepIndex) => entry.outputs.map((item) => [item.id, stepIndex] as const)));
  const resolve = (id: string): StepAsset => {
    const item = objects.get(id)!;
    const sourceStep = sources.get(id);
    const ready = assets[id];
    // Prepared mixtures must use their exact earlier output, never a stock raw
    // ingredient with a similar name. Raw ingredients/tools keep library art.
    const previous = sourceStep === undefined ? undefined : visuals[sourceStep];
    const src = sourceStep === undefined
      ? manifest[canonicalName(item.name)] || ready?.src
      : ready?.src || previous?.outputs?.find((output) => output.id === id)?.src ||
        (plan.steps[sourceStep].outputs[0]?.id === id ? previous?.result : undefined);
    return { ...ready, ...item, src, ...(sourceStep !== undefined ? { sourceStep } : {}) };
  };
  return {
    ingredients: step.inputs.map(resolve),
    tools: step.tools.map(resolve),
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

export async function loadAsset(asset: StepAsset, signal: AbortSignal): Promise<StepAsset> {
  const ready = { ...asset, src: asset.src ? mediaUrl(asset.src) : undefined };
  if (ready.src) {
    try { await loadImage(ready.src, signal); }
    catch (error) { if (signal.aborted) throw error; ready.src = undefined; }
  }
  return ready;
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
