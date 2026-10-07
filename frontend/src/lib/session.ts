import { isRecipe, type Message, type Recipe } from "./recipe";

export interface Session {
  recipe: Recipe;
  previous: Recipe | null;
  step: number;
  checked: number[];
  completed: number[];
  messages: Message[];
  draft: string;
  proposal: Recipe | null;
}
const key = (id: string) => `quiet-cup:v1:${id}`;
export function readSession(id: string): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(key(id)) || "null");
    if (!value || !isRecipe(value.recipe) || value.recipe.id !== id) return null;
    const indices = (items: unknown, length: number): number[] =>
      Array.isArray(items) ? items.filter((n) => Number.isInteger(n) && n >= 0 && n < length) : [];
    return {
      recipe: value.recipe,
      proposal: isRecipe(value.proposal) && value.proposal.id === id ? { ...value.proposal, image: value.recipe.image } : null,
      previous: isRecipe(value.previous) && value.previous.id === id ? value.previous : null,
      step: Number.isInteger(value.step) ? Math.max(0, Math.min(value.step, value.recipe.steps.length - 1)) : 0,
      checked: indices(value.checked, value.recipe.ingredients.length),
      completed: indices(value.completed, value.recipe.steps.length),
      messages: Array.isArray(value.messages) ? value.messages.filter((m: Message) => m && ["user", "agent"].includes(m.sender) && typeof m.text === "string" && m.text.length <= 12000).slice(-40) : [],
      draft: typeof value.draft === "string" ? value.draft.slice(0, 4000) : "",
    };
  } catch { return null; }
}
export function writeSession(value: Session): boolean {
  try {
    localStorage.setItem(key(value.recipe.id), JSON.stringify({ ...value, messages: value.messages.slice(-40) }));
    return true;
  } catch { return false; }
}
