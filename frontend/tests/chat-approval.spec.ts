import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { aiConfigured: true } }));
});
for (const approval of ["button", "typed yes"] as const) {
  test(`chat proposes a change and ${approval} updates ingredients and tutorial without another AI call`, async ({ page }) => {
    let calls = 0;
    await page.route("**/api/send-message", (route) => {
      calls++;
      const { context, mode } = route.request().postDataJSON();
      expect(mode).toBe("chat");
      return route.fulfill({ json: {
        reply: "I suggest adding 1 tsp vanilla. Shall I apply that?",
        recipe: { ...context, ingredients: [...context.ingredients, { name: "vanilla extract", amount: "1 tsp" }], steps: ["Stir in 1 tsp vanilla extract.", ...context.steps] },
      } });
    });
    await page.goto("/start/iced-matcha-latte");
    await page.getByRole("button", { name: "Step 3", exact: true }).click();
    await page.getByRole("tab", { name: "Ask the companion" }).click();
    await expect(page.getByLabel("Assistant action")).toHaveCount(0);
    await page.getByLabel("Message your café companion").fill("Can you add vanilla?");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("button", { name: "Yes, apply changes" })).toBeVisible();
    await expect(page.locator(".step-counter")).toHaveText("Step 3 of 6");
    await expect(page.locator(".ingredient-list")).not.toContainText("vanilla extract");
    if (approval === "button") await page.getByRole("button", { name: "Yes, apply changes" }).click();
    else {
      // A reload keeps the exact pending proposal available to confirm.
      await page.reload();
      await page.getByRole("tab", { name: "Ask the companion" }).click();
      await page.getByLabel("Message your café companion").fill("yes");
      await page.getByLabel("Message your café companion").press("Enter");
    }
    await expect(page.locator(".current-instruction")).toHaveText("Stir in 1 tsp vanilla extract.");
    await expect(page.locator(".step-counter")).toHaveText("Step 1 of 7");
    await expect(page.getByRole("button", { name: "Yes, apply changes" })).toHaveCount(0);
    expect(calls).toBe(1);
    await page.getByRole("button", { name: "View updated recipe" }).click();
    await expect(page.locator(".ingredient-list")).toContainText("vanilla extract");
    await page.reload();
    await expect(page.locator(".ingredient-list")).toContainText("vanilla extract");
    await page.getByRole("button", { name: "Undo change" }).click();
    await expect(page.locator(".ingredient-list")).not.toContainText("vanilla extract");
  });
}
test("typed no discards; qualified yes requests a revision instead of approving", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/send-message", (route) => {
    calls++;
    const { context, pendingRecipe } = route.request().postDataJSON();
    if (calls === 2) expect(pendingRecipe.name).toBe("Vanilla matcha");
    return route.fulfill({ json: { reply: "Would you like this change?", recipe: { ...context, name: calls === 1 ? "Vanilla matcha" : "Less sweet matcha" } } });
  });
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("tab", { name: "Ask the companion" }).click();
  const input = page.getByLabel("Message your café companion");
  await input.fill("Add vanilla");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: "Yes, apply changes" })).toBeVisible();
  await input.fill("yes but use less sugar");
  await input.press("Enter");
  await expect.poll(() => calls).toBe(2);
  await expect(page.getByRole("button", { name: "Yes, apply changes" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("iced matcha latte");
  await input.fill("no thanks");
  await input.press("Enter");
  await expect(page.getByText("Kept your recipe unchanged.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Yes, apply changes" })).toHaveCount(0);
  expect(calls).toBe(2);
  await page.reload();
  await page.getByRole("tab", { name: "Ask the companion" }).click();
  await expect(page.getByRole("button", { name: "Yes, apply changes" })).toHaveCount(0);
});
