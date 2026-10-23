import { test, expect } from "@playwright/test";

const ingredient = { id: "i1", name: "matcha powder", src: "/media/ingredient.png", segmented: true };
const tool = { id: "t1", name: "whisk", src: "/media/tool.png", segmented: true };
const plan = {
  ingredients: [{ id: "i1", name: "matcha powder", appearance: "Green powder" }],
  tools: [{ id: "t1", name: "whisk", appearance: "Whisk" }],
  steps: Array.from({ length: 6 }, (_, index) => ({ index, inputs: ["i1"], tools: ["t1"], actions: ["whisk"],
    outputs: [{ id: `s${index + 1}o1`, name: "prepared drink", appearance: "Drink", sourceStep: index }] })),
};
const visual = (index: number) => ({ ingredients: [ingredient], tools: [tool], actions: ["whisk"], result: `/media/result_${index}.png` });
const allVisuals = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [index, visual(index)]));
const snapshot = (id: string, ready = false) => ({ id, status: ready ? "complete" : "rendering", plan,
  message: "Preparing recipe illustrations…", assets: { i1: ingredient, t1: tool }, visuals: ready ? allVisuals : {},
  warnings: [], total: 6, completed: ready ? 6 : 0 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: true } }));
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: {} }));
  await page.route("**/media/*", route => route.fulfill({ path: "public/images/matcha_powder_seg.png", contentType: "image/png" }));
  await page.route("**/api/preparations/*/cancel", route => route.fulfill({ json: { cancelled: true } }));
});

test("opening a recipe starts one complete preparation and waits for artwork before playback", async ({ page }) => {
  let starts = 0, objectJobs = 0, ready = false;
  await page.route("**/api/preparation-assets", route => { objectJobs++; return route.fulfill({ status: 500 }); });
  await page.route("**/api/preparations", route => {
    starts++;
    expect(route.request().postDataJSON()).toMatchObject({ index: 0, scope: "recipe" });
    return route.fulfill({ json: snapshot(route.request().postDataJSON().id) });
  });
  await page.route("**/api/preparations/*", route => route.fulfill({ json: snapshot("job", ready) }));
  await page.clock.install();
  await page.goto("/start/iced-matcha-latte");
  await expect(page.locator(".step-asset").filter({ hasText: "matcha powder" }).locator("img")).toBeVisible();
  await expect(page.getByRole("button", { name: "Preparing illustration…" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Generate step result" })).toHaveCount(0);
  await expect(page.locator(".generated-result")).toHaveCount(0);
  await expect(page.locator(".cooking-scene")).not.toHaveClass(/is-playing/);
  ready = true;
  await page.clock.runFor(1100);
  await expect(page.locator(".generated-result")).toHaveAttribute("href", "/media/result_0.png");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.clock.runFor(2200);
  const opacity = await page.locator(".generated-result").evaluate(element => Number(getComputedStyle(element).opacity));
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  await expect(page.locator(".whisk-motion")).toBeVisible();
  expect(starts).toBe(1);
  expect(objectJobs).toBe(0);
});

test("step navigation keeps the background job and uses each prefetched result", async ({ page }) => {
  let starts = 0, cancellations = 0, ready = false;
  await page.route("**/api/preparations", route => { starts++; return route.fulfill({ json: snapshot(route.request().postDataJSON().id) }); });
  await page.route("**/api/preparations/*", route => route.fulfill({ json: snapshot("job", ready) }));
  await page.route("**/api/preparations/*/cancel", route => { cancellations++; return route.fulfill({ json: { cancelled: true } }); });
  await page.goto("/start/iced-matcha-latte");
  await expect.poll(() => starts).toBe(1);
  await page.getByRole("button", { name: "Step 4", exact: true }).click();
  expect(cancellations).toBe(0);
  ready = true;
  await expect(page.locator(".generated-result")).toHaveAttribute("href", "/media/result_3.png");
  await page.getByRole("button", { name: "Step 1", exact: true }).click();
  await expect(page.locator(".generated-result")).toHaveAttribute("href", "/media/result_0.png");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Replay transformation" }).click();
  expect(starts).toBe(1);
  expect(cancellations).toBe(0);
});

test("stop cancels preparation without restarting it; resume is explicit", async ({ page }) => {
  let starts = 0, polls = 0, cancellations = 0;
  await page.route("**/api/preparations", route => { starts++; return route.fulfill({ json: snapshot(route.request().postDataJSON().id, starts > 1) }); });
  await page.route("**/api/preparations/*", route => { polls++; return route.fulfill({ json: snapshot("job") }); });
  await page.route("**/api/preparations/*/cancel", route => { cancellations++; return route.fulfill({ json: { cancelled: true } }); });
  await page.goto("/start/iced-matcha-latte");
  await expect.poll(() => starts).toBe(1);
  await page.getByRole("button", { name: "Stop preparing illustrations" }).click();
  await expect.poll(() => cancellations).toBe(1);
  const stoppedPolls = polls;
  await page.waitForTimeout(1200);
  expect(polls).toBe(stoppedPolls);
  expect(starts).toBe(1);
  await expect(page.getByRole("button", { name: "Play illustration", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Resume illustrations" }).click();
  await expect(page.locator(".generated-result")).toHaveAttribute("href", "/media/result_0.png");
  expect(starts).toBe(2);
});

test("a failed background job keeps ready steps and retries only on request", async ({ page }) => {
  let starts = 0;
  await page.route("**/api/preparations", route => {
    starts++;
    return route.fulfill({ json: starts === 1 ? { ...snapshot(route.request().postDataJSON().id), status: "error",
      error: "Another step could not be illustrated.", visuals: { 0: visual(0) } } : snapshot(route.request().postDataJSON().id, true) });
  });
  await page.goto("/start/iced-matcha-latte");
  await expect(page.getByRole("alert")).toContainText("Another step could not be illustrated");
  await expect(page.locator(".generated-result")).toHaveAttribute("href", "/media/result_0.png");
  await page.getByRole("button", { name: "Step 4", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play illustration", exact: true })).toBeEnabled();
  expect(starts).toBe(1);
  await page.getByRole("button", { name: "Retry illustrations" }).click();
  await expect(page.locator(".generated-result")).toHaveAttribute("href", "/media/result_3.png");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(starts).toBe(2);
});

test("leaving the recipe cancels its unfinished preparation", async ({ page }) => {
  let starts = 0, cancellations = 0;
  await page.route("**/api/preparations", route => { starts++; return route.fulfill({ json: snapshot(route.request().postDataJSON().id) }); });
  await page.route("**/api/preparations/*", route => route.fulfill({ json: snapshot("job") }));
  await page.route("**/api/preparations/*/cancel", route => { cancellations++; return route.fulfill({ json: { cancelled: true } }); });
  await page.goto("/start/iced-matcha-latte");
  await expect.poll(() => starts).toBe(1);
  await page.getByRole("link", { name: "All recipes" }).click();
  await expect.poll(() => cancellations).toBe(1);
  await expect(page.locator(".recipe-tile").first()).toBeVisible();
});
