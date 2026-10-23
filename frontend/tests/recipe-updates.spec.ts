import { test, expect } from "@playwright/test";
import recipes from "../public/recipes.json" with { type: "json" };

const pumpkin = recipes.find(recipe => recipe.id === "pumpkin-spice-maple-matcha-latte")!;
const legacy = { ...pumpkin,
  description: "A cozy autumn-inspired iced matcha drink with pumpkin spice, maple sweetness, and creamy foam.",
  steps: [
    "Sift matcha powder into a bowl and add pumpkin spice.",
    "Pour hot water over the matcha and whisk until smooth and frothy.",
    "Add 10g pumpkin puree and the 15ml maple syrup to the matcha mixture and whisk until combined.",
    "In a separate cup, froth the heavy cream, 15ml milk, 5ml maple syrup (foam), and remaining 5g pumpkin puree until thick and creamy.",
    "Fill a glass with ice and pour in the matcha base.",
    "Add the non-dairy milk and stir gently.",
    "Spoon the sweet cream foam on top and finish with a pinch of ground cinnamon.",
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: false } }));
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: {} }));
});

test("the pumpkin recipe keeps plain matcha separate from the pumpkin base and spice foam", async ({ page }) => {
  await page.goto(`/start/${pumpkin.id}`);
  await expect(page.locator(".current-instruction")).toHaveText("Sift the 4g matcha powder into a bowl.");
  await expect(page.locator(".step-assets")).not.toContainText("pumpkin spice");
  await page.getByRole("button", { name: "Step 2", exact: true }).click();
  await expect(page.locator(".current-instruction")).toContainText("Set the prepared matcha aside");
  await page.getByRole("button", { name: "Step 3", exact: true }).click();
  await expect(page.locator(".current-instruction")).toContainText("serving glass");
  await page.getByRole("button", { name: "Step 4", exact: true }).click();
  await expect(page.locator(".current-instruction")).toContainText("0.5g pumpkin spice");
  await page.getByRole("button", { name: "Step 6", exact: true }).click();
  await expect(page.locator(".current-instruction")).toContainText("prepared matcha over the iced pumpkin-maple milk");
});

for (const customized of [false, true]) {
  test(`saved ${customized ? "personalized recipe is preserved" : "original recipe receives the correction"}`, async ({ page }) => {
    const saved = customized ? { ...legacy, name: "My pumpkin matcha", portion: 2 } : legacy;
    await page.addInitScript(recipe => localStorage.setItem(`quiet-cup:v1:${recipe.id}`, JSON.stringify({
      recipe, previous: null, proposal: null, step: 2, completed: [0, 1], checked: [0],
      messages: [{ sender: "user", text: "I like oat milk." }], draft: "Keep it creamy",
    })), saved);
    await page.goto(`/start/${pumpkin.id}`);
    await expect(page.locator(".current-instruction")).toHaveText(customized ? legacy.steps[2] : pumpkin.steps[0]);
    await expect(page.locator(".visited-step")).toHaveCount(customized ? 2 : 0);
    await expect(page.getByRole("checkbox").first()).toBeChecked();
    await page.getByRole("tab", { name: "Ask the companion" }).click();
    await expect(page.getByText("I like oat milk.")).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveValue("Keep it creamy");
  });
}
