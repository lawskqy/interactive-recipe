import { test, expect } from "@playwright/test";
import recipes from "../public/recipes.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { aiConfigured: false } }));
});
test("malformed manifests and missing tutorial covers keep all recipes usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/asset-manifest.json", (route) => route.fulfill({ json: null }));
  await page.route("**/thumbnails/*", (route) => route.fulfill({ status: 404 }));
  await page.route("**/images/*", (route) => route.fulfill({ status: 404 }));
  await page.goto("/start/iced-matcha-latte");
  await expect(page.locator(".cover-preview")).toHaveJSProperty("naturalWidth", 480);
  await expect(page.locator(".cover-preview")).toHaveAttribute("src", /recipe-placeholder|^data:/);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".step-counter")).toHaveText("Step 2 of 6");
  expect(errors).toEqual([]);
});
test("AI proposals never apply automatically; approved edits, chat, checklists and progress survive reload", async ({ page }) => {
  await page.route("**/api/send-message", async (route) => {
    const { context } = route.request().postDataJSON();
    await route.fulfill({ json: { reply: "Here is a suggestion.", recipe: { ...context, name: "Saved matcha" } } });
  });
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("tab", { name: "Ask the companion" }).click();
  await page.getByLabel("Message your café companion").fill("What is a whisk?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Here is a suggestion.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("iced matcha latte");
  await expect(page.getByRole("button", { name: "Yes, apply changes" })).toBeVisible();
  await page.getByRole("button", { name: "No, keep my recipe" }).click();
  await page.getByLabel("Message your café companion").fill("Rename my recipe");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByRole("button", { name: "Yes, apply changes" }).click();
  await page.getByRole("tab", { name: "The recipe", exact: true }).click();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Mark step complete" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Saved matcha");
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  await expect(page.locator(".step-counter")).toHaveText("Step 2 of 6");
  await expect(page.locator(".visited-step")).toHaveCount(1);
  await page.getByRole("tab", { name: "Ask the companion" }).click();
  await expect(page.getByText("What is a whisk?")).toBeVisible();
  await page.getByRole("button", { name: "Undo change" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("iced matcha latte");
});
test("completion requires each step and restarting resets preparation", async ({ page }) => {
  await page.goto("/start/iced-matcha-latte");
  for (let i = 1; i <= 6; i++) {
    await page.getByRole("button", { name: `Step ${i}`, exact: true }).click();
    await page.getByRole("button", { name: "Mark step complete" }).click();
  }
  await expect(page.getByText("Your cup is ready. Enjoy ♡")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Your cup is ready. Enjoy ♡")).toBeVisible();
  await page.getByRole("button", { name: "Restart preparation" }).click();
  await expect(page.locator(".visited-step")).toHaveCount(0);
  await expect(page.locator(".step-counter")).toHaveText("Step 1 of 6");
});
test("search normalizes whitespace and filters survive a round trip", async ({ page }) => {
  await page.goto("/collection");
  await page.getByRole("searchbox").fill("  blueberry   matcha  ");
  await expect(page.locator(".recipe-tile")).toHaveCount(1);
  await page.locator(".recipe-tile").click();
  await page.getByRole("button", { name: /make it/ }).click();
  await page.getByRole("link", { name: "All recipes" }).click();
  await expect(page.locator(".recipe-tile")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".recipe-tile")).toHaveCount(1);
});
test("all 50 recipe routes render without overflow", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const recipe of recipes) {
    await page.goto(`/start/${recipe.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(recipe.name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});
