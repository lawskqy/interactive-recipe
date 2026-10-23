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
      ? ready?.src || manifest[canonicalName(item.name)]
      : ready?.src || previous?.outputs?.find((output) => output.id === id)?.src ||
        (plan.steps[sourceStep].outputs[0]?.id === id ? previous?.result : undefined);
    const segmented = ready?.src === src ? ready?.segmented :
      sourceStep !== undefined && (previous?.outputs?.some((output) => output.src === src && output.segmented) ||
        (previous?.result === src && previous?.resultSegmented));
    return { ...ready, ...item, src, segmented: !!segmented, ...(sourceStep !== undefined ? { sourceStep } : {}) };
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
  return new Promise<boolean>((resolve, reject) => {
    signal.throwIfAborted();
    const image = new Image();
    const finish = (error?: unknown, segmented = false) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
      if (error) { image.src = ""; reject(error); }
      else resolve(segmented);
    };
    const abort = () => finish(signal.reason);
    const timer = window.setTimeout(() => finish(new Error("The illustration could not be loaded. Please retry.")), 15000);
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const width = image.naturalWidth, height = image.naturalHeight;
        if (!width || !height || width * height > 16777216) throw new Error("The illustration is too large.");
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("The illustration could not be checked.");
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, width, height).data;
        let transparent = 0, visible = 0, border = 0, clearBorder = 0;
        for (let p = 0; p < width * height; p++) {
          const alpha = pixels[p * 4 + 3];
          if (alpha <= 8) transparent++;
          if (alpha > 8) visible++;
          const x = p % width, y = Math.floor(p / width);
          if (!x || !y || x === width - 1 || y === height - 1) {
            border++;
            if (alpha <= 8) clearBorder++;
          }
        }
        finish(undefined, transparent >= width * height * 0.01 && visible >= width * height * 0.001 && clearBorder >= border * 0.9);
      } catch (error) { finish(error); }
    };
    image.onerror = () => finish(new Error("The illustration could not be loaded. Please retry."));
    signal.addEventListener("abort", abort, { once: true });
    image.src = src;
  });
}

export async function loadAsset(asset: StepAsset, signal: AbortSignal, required = false): Promise<StepAsset> {
  try {
    if (!asset.src) throw new Error("The illustration could not be loaded. Please retry.");
    let src = mediaUrl(asset.src);
    if (!(await loadImage(src, signal))) {
      const repaired = await api<StepAsset>("artwork/segment", { src: asset.src }, signal);
      if (!repaired.src || !repaired.segmented) throw new Error("Background removal is incomplete. Please retry.");
      src = mediaUrl(repaired.src);
      if (!(await loadImage(src, signal))) throw new Error("Background removal is incomplete. Please retry.");
    }
    return { ...asset, src, segmented: true };
  } catch (error) {
    if (signal.aborted || required) throw error;
    return { ...asset, src: undefined, segmented: false };
  }
}

export async function loadVisual(visual: StepVisual, signal: AbortSignal): Promise<StepVisual> {
  if (!visual.result) throw new Error("The preparation returned no result artwork.");
  const result = await loadAsset({ name: visual.resultName || "Preparation", src: visual.result }, signal, true);
  const convert = (asset: StepAsset) => asset.src === visual.result
    ? Promise.resolve({ ...asset, src: result.src, segmented: true }) : loadAsset(asset, signal);
  const [ingredients, tools, outputs] = await Promise.all([
    Promise.all(visual.ingredients.map(convert)), Promise.all(visual.tools.map(convert)),
    visual.outputs ? Promise.all(visual.outputs.map(convert)) : undefined,
  ]);
  return { ...visual, ingredients, tools, outputs, result: result.src, resultSegmented: true };
}

export function cancelPreparation(id: string) {
  return api(`preparations/${id}/cancel`, {}).catch(() => {
    // Unobserved server jobs also stop between tasks after their polling lease expires.
  });
}
