import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { aiConfigured: true } }),
  );
  await page.route("**/api/preparations/*/cancel", (route) => route.fulfill({ json: { cancelled: true } }));
  await page.route("**/api/preparations", (route) =>
    route.fulfill({ json: { id: route.request().postDataJSON().id, status: "complete", message: "Ready", completed: 1, total: 1, warnings: [], visuals: {
      0: { ingredients: [{ id: "i1", name: "matcha powder", src: "/images/matcha_powder_seg.png" }], tools: [], actions: ["whisk"], result: "/media/step.png" },
    } } }),
  );
  await page.route("**/media/step.png", (route) =>
    route.fulfill({ path: "public/thumbnails/iced-matcha-latte.webp", contentType: "image/webp" }),
  );
});

test("AI results gather, burst and reveal with pause, replay and reset", async ({ page }) => {
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/preparations")) requests++;
  });
  await page.clock.install();
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("button", { name: "Illustrate with AI" }).click();
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
  await page.getByRole("button", { name: "Replay transformation" }).click();
  await expect(page.locator(".step-transformation")).toBeVisible();
  await page.clock.runFor(700);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
  await expect(page.locator(".step-transformation")).toHaveCount(0);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".generated-result")).toHaveCount(0);
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  expect(requests).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("AI transformation respects reduced motion, including changes during playback", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("button", { name: "Illustrate with AI" }).click();
  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
  await expect(page.locator(".step-transformation")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Replay transformation" })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Replay transformation" }).click();
  await expect(page.locator(".step-transformation")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".step-transformation")).toHaveCount(0);
  await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
});

test("unloadable AI artwork keeps the offline illustration available", async ({ page }) => {
  await page.route("**/media/step.png", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("button", { name: "Illustrate with AI" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  await expect(page.locator(".step-transformation")).toHaveCount(0);
  await page.getByRole("button", { name: "Play illustration" }).click();
  await expect(page.locator(".action-scene")).toBeVisible();
});
