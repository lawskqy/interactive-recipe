import type { Recipe } from "./recipe";

const previousPumpkinSteps = [
  "Sift matcha powder into a bowl and add pumpkin spice.",
  "Pour hot water over the matcha and whisk until smooth and frothy.",
  "Add 10g pumpkin puree and the 15ml maple syrup to the matcha mixture and whisk until combined.",
  "In a separate cup, froth the heavy cream, 15ml milk, 5ml maple syrup (foam), and remaining 5g pumpkin puree until thick and creamy.",
  "Fill a glass with ice and pour in the matcha base.",
  "Add the non-dairy milk and stir gently.",
  "Spoon the sweet cream foam on top and finish with a pinch of ground cinnamon.",
];

// Only replace the exact previously shipped recipe. Personalizations, pending
// proposals and undo history stay under the user's control.
export function isOutdatedCatalogRecipe(saved: Recipe, current: Recipe): boolean {
  return current.id === "pumpkin-spice-maple-matcha-latte" && saved.id === current.id &&
    saved.name === current.name && saved.category === current.category && saved.portion === current.portion &&
    saved.image === current.image &&
    saved.description === "A cozy autumn-inspired iced matcha drink with pumpkin spice, maple sweetness, and creamy foam." &&
    JSON.stringify(saved.ingredients) === JSON.stringify(current.ingredients) &&
    JSON.stringify(saved.steps) === JSON.stringify(previousPumpkinSteps);
}
