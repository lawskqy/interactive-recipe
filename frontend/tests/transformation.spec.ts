import { test, expect } from "@playwright/test";
import { allStepVisuals } from "./artwork-fixtures";
import recipes from "../public/recipes.json" with { type: "json" };

test.beforeEach(async ({ page }) => {
  await page.route("**/images/matcha_powder_seg.png", route =>
    route.fulfill({ path: "public/images/matcha_powder_seg.png", contentType: "image/png" }));
  await page.route("**/api/preparation-assets", route => route.fulfill({ json: { id: route.request().postDataJSON().id, status: "complete", message: "Ready", assets: {}, visuals: {}, warnings: [] } }));
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { aiConfigured: true } }),
  );
  await page.route("**/api/preparations/*/cancel", (route) => route.fulfill({ json: { cancelled: true } }));
  await page.route("**/api/preparations", (route) =>
    route.fulfill({ json: { id: route.request().postDataJSON().id, status: "complete", message: "Ready", completed: 1, total: 1, warnings: [], visuals: allStepVisuals({
      0: { ingredients: [{ id: "i1", name: "matcha powder", src: "/images/matcha_powder_seg.png" }], tools: [], actions: ["whisk"], result: "/media/step.png" },
    }) } }),
  );
  await page.route("**/media/step.png", (route) =>
    route.fulfill({ path: "public/images/matcha_powder_seg.png", contentType: "image/png" }),
  );
});

test("AI results gather, burst and reveal with pause, replay and reset", async ({ page }) => {
  // Actions outside the prototype vocabulary retain the existing transformation.
  await page.route("**/recipes.json", route => route.fulfill({ json: recipes.map(recipe =>
    recipe.id === "iced-matcha-latte" ? { ...recipe, steps: ["Stir matcha with cold water.", ...recipe.steps.slice(1)] } : recipe) }));
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/preparations")) requests++;
  });
  await page.clock.install();
  await page.goto("/start/iced-matcha-latte");

  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.locator(".step-transformation image").first()).toBeVisible();
  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "0");
  await page.clock.runFor(1000);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const pausedScene = await page.locator(".step-transformation").innerHTML();
  await page.clock.runFor(1500);
  expect(await page.locator(".step-transformation").innerHTML()).toBe(pausedScene);
  await page.locator(".visual-board").screenshot({ path: `test-results/ai-gather-${test.info().project.name}.png` });
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.locator(".step-transformation > circle").last()).toHaveAttribute("opacity", /0\.[1-9]/);
  await page.locator(".visual-board").screenshot({ path: `test-results/ai-burst-${test.info().project.name}.png` });
  await page.clock.runFor(6000);
  await expect(page.locator(".step-transformation")).toHaveCount(0);
  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
  await expect(page.locator(".illustration-stage figcaption")).toHaveCount(0);
  await page.getByRole("button", { name: "Replay transformation" }).click();
  await expect(page.locator(".step-transformation")).toBeVisible();
  await page.clock.runFor(700);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
  await expect(page.locator(".step-transformation")).toHaveCount(0);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".generated-result")).toBeVisible();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  expect(requests).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("AI transformation respects reduced motion, including changes during playback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/start/iced-matcha-latte");

  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
  await expect(page.locator(".step-transformation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Replay transformation" })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay transformation" }).click();
  await expect(page.locator(".cooking-scene")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".cooking-scene")).not.toHaveClass(/is-playing/);
  await expect(page.locator(".receiver-content")).toHaveCSS("opacity", "0");
  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
});

test("supported action gradually reveals its generated artwork during the demonstration", async ({ page }) => {
  await page.clock.install();
  await page.goto("/start/iced-matcha-latte");

  await expect(page.locator("[data-action=whisk]")).toBeVisible();
  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "0");
  await page.clock.runFor(1600);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const scene = await page.locator(".cooking-scene").innerHTML();
  await page.clock.runFor(1000);
  expect(await page.locator(".cooking-scene").innerHTML()).toBe(scene);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(6000);
  await expect(page.locator(".receiver-content")).toHaveCSS("opacity", "0");
  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
});

test("unloadable AI artwork keeps the offline illustration available", async ({ page }) => {
  await page.route("**/media/step.png", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/start/iced-matcha-latte");

  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  await expect(page.locator(".step-transformation")).toHaveCount(0);
  await page.getByRole("button", { name: "Play illustration" }).click();
  await expect(page.locator(".action-scene")).toBeVisible();
});

for (const [action, instruction, tool, moving] of [
  ["whisk", "Whisk matcha with water.", "bamboo whisk", ".whisk-motion"],
  ["sift", "Sift matcha powder into a bowl.", "sifter", ".sieve-motion"],
  ["pour", "Pour milk into the cup.", "pitcher", ".pitcher-motion"],
]) {
  test(`${action} animates cutouts with the generated result and reuses them on replay`, async ({ page }) => {
    let generations = 0;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/asset-manifest.json", route => route.fulfill({ json: {} }));
    await page.route("**/recipes.json", route => route.fulfill({ json: recipes.map(recipe =>
      recipe.id === "iced-matcha-latte" ? { ...recipe, steps: [instruction, ...recipe.steps.slice(1)] } : recipe) }));
    await page.route("**/media/tool.png", route => route.fulfill({ path: "public/images/matcha_powder_seg.png", contentType: "image/png" }));
    await page.route("**/media/milk.png", route => route.fulfill({ path: "public/images/matcha_powder_seg.png", contentType: "image/png" }));
    await page.route("**/api/preparations", route => {
      generations++;
      return route.fulfill({ json: { id: route.request().postDataJSON().id, status: "complete", message: "Ready", completed: 1, total: 1, warnings: [], visuals: allStepVisuals({
        0: { ingredients: [{ name: "milk", src: "/media/milk.png" }], tools: [{ name: tool, src: "/media/tool.png" }], actions: [action], result: "/media/step.png" },
      }) } });
    });
    await page.clock.install();
    await page.goto("/start/iced-matcha-latte");

    const scene = page.locator(`[data-action=${action}]`);
    const movingPart = scene.locator(moving);
    await expect(scene.locator('image[href="/media/step.png"]')).toHaveCSS("opacity", "0");
    await expect(movingPart.locator("image")).toHaveAttribute("href", action === "pour" ? "/media/milk.png" : "/media/tool.png");
    const initial = await movingPart.getAttribute("style");
    await page.clock.runFor(1300);
    expect(await movingPart.getAttribute("style")).not.toBe(initial);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const paused = await scene.innerHTML();
    await page.clock.runFor(700);
    expect(await scene.innerHTML()).toBe(paused);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
    await page.getByRole("button", { name: "Replay transformation" }).click();
    await expect(movingPart.locator("image")).toBeVisible();
    await page.clock.runFor(6500);
    await expect(scene.locator(".receiver-content")).toHaveCSS("opacity", "0");
    await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
    expect(generations).toBe(1);
    expect(errors).toEqual([]);
  });
}
