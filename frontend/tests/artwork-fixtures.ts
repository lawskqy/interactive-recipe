export function allStepVisuals<T>(visuals: Record<number, T>, count = 6): Record<number, T> {
  const fallback = Object.values(visuals)[0];
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [index, visuals[index] ?? fallback]));
}
export const plannedAction = (type: string, items: string[], extra: Record<string, unknown> = {}) => ({ type, items,
  container: "", tool: "", color: "#8d9d65", resultColor: "#8d9d65", texture: "liquid", seconds: 0, optional: false, ...extra });
