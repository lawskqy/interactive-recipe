export function allStepVisuals<T>(visuals: Record<number, T>, count = 6): Record<number, T> {
  const fallback = Object.values(visuals)[0];
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [index, visuals[index] ?? fallback]));
}
