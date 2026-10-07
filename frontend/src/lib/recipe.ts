export interface Ingredient {
  name: string;
  amount: string;
}
export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: "warm drinks" | "cold drinks";
  portion: number;
  ingredients: Ingredient[];
  steps: string[];
  image: string;
}
export interface Message {
  sender: "user" | "agent";
  text: string;
}
export interface StepAsset {
  name: string;
  src?: string;
}
export interface StepVisual {
  ingredients: StepAsset[];
  tools: StepAsset[];
  actions: string[];
  result?: string;
}
export function safeManifest(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, path]) =>
    /^[\w-]+$/.test(key) && typeof path === "string" && /^\/assets\/[\w-]+\.webp$/.test(path),
  ));
}
export const canonicalName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "")
    .slice(0, 40);
export function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const r = value as Recipe;
  return (
    typeof r.id === "string" &&
    /^[a-z0-9-]{1,120}$/.test(r.id) &&
    typeof r.name === "string" &&
    r.name.trim().length > 0 &&
    r.name.length <= 160 &&
    typeof r.description === "string" &&
    r.description.length <= 2000 &&
    ["warm drinks", "cold drinks"].includes(r.category) &&
    Number.isFinite(r.portion) &&
    r.portion > 0 &&
    r.portion <= 100 &&
    typeof r.image === "string" &&
    /^[\w-]+\.png$/.test(r.image) &&
    Array.isArray(r.steps) &&
    r.steps.length > 0 &&
    r.steps.length <= 40 &&
    r.steps.every(
      (s) => typeof s === "string" && s.trim().length > 0 && s.length <= 3000,
    ) &&
    Array.isArray(r.ingredients) &&
    r.ingredients.length > 0 &&
    r.ingredients.length <= 60 &&
    r.ingredients.every(
      (i) =>
        i &&
        typeof i.name === "string" &&
        i.name.trim().length > 0 &&
        i.name.length <= 160 &&
        typeof i.amount === "string" &&
        i.amount.trim().length > 0 &&
        i.amount.length <= 160,
    )
  );
}
export async function loadRecipes(signal?: AbortSignal): Promise<Recipe[]> {
  const response = await fetch("/recipes.json", { signal });
  if (!response.ok)
    throw new Error(
      "The recipe collection could not be loaded. Please try again.",
    );
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isRecipe))
    throw new Error("The recipe collection contains invalid data.");
  return data;
}
const toolRules: [RegExp, string][] = [
  [/whisk|mix/, "whisk"],
  [/sift/, "sifter"],
  [/froth/, "milk frother"],
  [/blend/, "blender"],
  [/mash|muddle/, "muddler"],
  [/heat|warm the|steam/, "pot"],
  [/glass/, "glass"],
  [/bowl/, "bowl"],
  [/cup|mug/, "cup"],
  [/spoon/, "spoon"],
  [/refrigerat|chill|sit for|steep/, "timer"],
];
export function describeStep(
  recipe: Recipe,
  index: number,
  manifest: Record<string, string>,
): StepVisual {
  const step = recipe.steps[index].toLowerCase();
  const asset = (name: string): StepAsset => ({
    name,
    src: manifest[canonicalName(name)],
  });
  const ingredients = recipe.ingredients
    .filter((i) =>
      i.name
        .toLowerCase()
        .split(/\s+or\s+/)
        .some(
          (n) =>
            step.includes(n) ||
            (n.endsWith(" powder") && step.includes(n.replace(" powder", ""))),
        ),
    )
    .map((i) => asset(i.name));
  const tools = toolRules
    .filter(([pattern]) => pattern.test(step))
    .map(([, name]) => asset(name));
  const actions = [
    "pour",
    "whisk",
    "froth",
    "stir",
    "heat",
    "chill",
    "steep",
    "serve",
  ].filter((action) => step.includes(action)).sort((a, b) => step.indexOf(a) - step.indexOf(b));
  return { ingredients, tools, actions };
}
