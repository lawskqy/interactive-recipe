import { test, expect } from "@playwright/test";
import { plannedAction } from "./artwork-fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: false } }));
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: {} }));
});

for (const [name, action, movingPart] of [
  ["Whisk", "whisk", ".whisk-motion"],
  ["Sift", "sift", ".sieve-motion"],
  ["Pour", "pour", ".pitcher-motion"],
]) {
  test(`${name} moves, pauses, resets and replays without AI`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let apiCalls = 0;
    page.on("request", request => { if (request.url().includes("/api/")) apiCalls++; });
    await page.clock.install();
    await page.goto("/animations");
    await page.getByRole("button", { name, exact: true }).click();
    const scene = page.locator(`[data-action="${action}"]`);
    const part = scene.locator(movingPart);
    await expect(scene).toBeVisible();
    const initial = await part.getAttribute("style");
    await page.getByRole("button", { name: "Play illustration", exact: true }).click();
    await page.clock.runFor(1500);
    expect(await part.getAttribute("style")).not.toBe(initial);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const paused = await scene.innerHTML();
    await page.clock.runFor(1000);
    expect(await scene.innerHTML()).toBe(paused);
    await scene.screenshot({ path: `test-results/${action}-${test.info().project.name}.png` });
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await page.clock.runFor(6000);
    await expect(page.getByRole("button", { name: "Replay illustration" })).toBeVisible();
    await page.getByRole("button", { name: "Replay illustration" }).click();
    await page.clock.runFor(1200);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play illustration", exact: true })).toBeVisible();
    expect(await part.getAttribute("style")).toBe(initial);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(apiCalls).toBe(0);
    expect(errors).toEqual([]);
  });
}

test("compound steps play actions in instruction order and cancel cleanly", async ({ page }) => {
  await page.clock.install();
  await page.goto("/animations");
  await page.getByRole("button", { name: "Sequence", exact: true }).click();
  await expect(page.getByRole("list", { name: "Actions in this step" }).locator("li")).toHaveText(["sift", "pour", "whisk"]);
  await page.getByRole("button", { name: "Play illustration", exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.locator("[data-action=pour]")).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.locator("[data-action=whisk]")).toBeVisible();
  await page.getByRole("button", { name: "Pour", exact: true }).click();
  await page.clock.runFor(6000);
  await expect(page.locator("[data-action=pour]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play illustration", exact: true })).toBeVisible();
});

test("action detection ignores tool nouns, prepared ingredients and negations", async ({ page }) => {
  await page.goto("/animations");
  for (const instruction of ["Use a whisk to mix hot water.", "Add whiskey and whisked cream.", "Do not whisk the milk.", "Avoid sifting the powder."]) {
    await page.getByLabel("Your recipe step").fill(instruction);
    await page.getByRole("button", { name: "Preview step" }).click();
    await expect(page.getByRole("status")).toContainText("No supported action");
  }
  await page.getByLabel("Your recipe step").fill("Whisk matcha with hot water until smooth.");
  await page.getByRole("button", { name: "Preview step" }).click();
  await expect(page.locator("[data-action=whisk]")).toBeVisible();
  await expect(page.locator("[data-action]")).toHaveCount(1);
});

test("recipe steps select their action and reset when navigating", async ({ page }) => {
  await page.goto("/start/iced-matcha-latte");
  await expect(page.locator("[data-action=whisk]")).toBeVisible();
  await page.getByRole("button", { name: "Play illustration", exact: true }).click();
  await page.getByRole("button", { name: "Step 4", exact: true }).click();
  await expect(page.locator("[data-action=pour]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play illustration", exact: true })).toBeVisible();
});

test("planner actions replace keyword matching and colour the scene", async ({ page }) => {
  const plan = {
    ingredients: [{ id: "i1", name: "matcha powder", appearance: "Green powder" }, { id: "i2", name: "water", appearance: "Water" }],
    tools: [{ id: "t1", name: "bowl", appearance: "Bowl" }],
    steps: Array.from({ length: 6 }, (_, index) => ({ index, inputs: ["i1", "i2"], tools: ["t1"],
      actions: index ? [plannedAction("stir", ["i1"])] : [plannedAction("sift", ["i1"], { container: "t1" }),
        plannedAction("stir", ["i1"]), plannedAction("layer", ["i2"], { color: "#123456" })],
      outputs: [{ id: `s${index + 1}o1`, name: "result", appearance: "Drink", sourceStep: index }] })),
  };
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: true } }));
  await page.route("**/api/preparations/*/cancel", route => route.fulfill({ json: { cancelled: true } }));
  // A stopped job still delivers its plan, so the step can animate without artwork.
  await page.route("**/api/preparations", route => route.fulfill({ json: { id: route.request().postDataJSON().id,
    status: "cancelled", message: "Illustration cancelled.", plan, visuals: {}, assets: {}, warnings: [], total: 0, completed: 0 } }));
  await page.clock.install();
  await page.goto("/start/iced-matcha-latte");
  await expect(page.getByRole("list", { name: "Actions in this step" }).locator("li")).toHaveText(["sift", "stir", "layer"]);
  await expect(page.locator("[data-action=sift]")).toBeVisible();
  await page.getByRole("button", { name: "Play illustration", exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.locator("[data-action=layer]")).toBeVisible();
  await expect(page.locator(".liquid-stream")).toHaveAttribute("stroke", "#123456");
  await expect(page.locator(".action-sequence [aria-current=step]")).toHaveText("layer");
  await page.getByRole("button", { name: "Step 2", exact: true }).click();
  await expect(page.locator("[data-action]")).toHaveCount(0);
});

test("reduced motion gives a still scene and stops an active demonstration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/animations");
  await expect(page.locator("[data-action=whisk]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play illustration", exact: true })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Play illustration", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".cooking-scene")).not.toHaveClass(/is-playing/);
  await expect(page.getByText("Still view · reduced motion")).toBeVisible();
});

test("preview page passes accessibility checks", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/animations");
  await page.getByRole("button", { name: "Sequence", exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("simple illustrations animate available artwork without generating a result", async ({ page }) => {
  let paidRequests = 0;
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("/api/")) paidRequests++; });
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: { whisk: "/assets/whisk.webp" } }));
  await page.route("**/assets/whisk.webp", route => route.fulfill({ path: "public/images/matcha_powder_seg.png", contentType: "image/png" }));
  await page.clock.install();
  await page.goto("/start/iced-matcha-latte");
  const tool = page.locator(".whisk-motion");
  await expect(tool.locator("image")).toHaveAttribute("href", "/assets/whisk.webp");
  await expect(page.locator(".generated-result")).toHaveCount(0);
  const initial = await tool.getAttribute("style");
  await page.getByRole("button", { name: "Play illustration", exact: true }).click();
  await page.clock.runFor(1400);
  expect(await tool.getAttribute("style")).not.toBe(initial);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  expect(await tool.getAttribute("style")).toBe(initial);
  expect(paidRequests).toBe(0);
});
