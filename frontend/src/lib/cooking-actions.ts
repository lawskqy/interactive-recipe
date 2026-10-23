export type CookingAction = "whisk" | "sift" | "pour";
export interface ActionCue { kind: CookingAction; context: string }
export const ACTION_DURATION = 4800;

// A deliberately small, offline prototype vocabulary. Whole words avoid
// “whiskey” and “whisked milk”; clause checks exclude tools and negated actions.
// A semantic recipe planner can supply richer cues in a later iteration.
export function cookingActions(instruction: string): ActionCue[] {
  const text = instruction.toLowerCase().replace(/[’‘]/g, "'");
  const matches = [...text.matchAll(/\b(whisk|sift|pour)(?:ing|s)?\b/g)];
  return matches.flatMap((match, index) => {
    const before = text.slice(0, match.index);
    const clause = before.split(/[.;,!]|\b(?:then|but)\b/).pop() || "";
    if (/\b(?:do not|don't|never|without|avoid|no need to)\b/.test(clause) ||
        /\b(?:a|an|the|your|using|with)\s+(?:small\s+|bamboo\s+|balloon\s+)?$/.test(clause)) return [];
    return [{ kind: match[1] as CookingAction,
      context: text.slice(match.index, matches[index + 1]?.index ?? text.length) }];
  });
}

export function ingredientColor(context: string) {
  // The source comes before “into/over”, so pouring milk over matcha stays pale.
  const source = context.split(/\b(?:into|over|onto)\b/)[0];
  if (/matcha/.test(source)) return "#8d9d65";
  if (/cocoa|chocolate|coffee|espresso|hojicha/.test(source)) return "#9b7050";
  if (/milk|cream|flour|sugar/.test(source)) return "#e9dfc5";
  if (/water/.test(source)) return "#9bbfc1";
  return "#c9aa73";
}
