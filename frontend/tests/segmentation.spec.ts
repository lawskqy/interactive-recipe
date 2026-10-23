import { test, expect } from "@playwright/test";
import { allStepVisuals } from "./artwork-fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/preparations", route => route.fulfill({ json: { id: route.request().postDataJSON().id, status: "rendering", assets: {}, visuals: {}, warnings: [] } }));
  await page.route("**/api/preparations/*", route => route.fulfill({ json: { status: "rendering", assets: {}, visuals: {}, warnings: [] } }));
  await page.route("**/api/preparation-assets", route => route.fulfill({ json: { id: route.request().postDataJSON().id, status: "complete", message: "Ready", assets: {}, visuals: {}, warnings: [] } }));
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: true } }));
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: {} }));
  await page.route("**/api/preparations/*/cancel", route => route.fulfill({ json: { cancelled: true } }));
  await page.route("**/media/opaque_seg.png", route => route.fulfill({ path: "public/thumbnails/iced-matcha-latte.webp", contentType: "image/webp" }));
  await page.route("**/media/repaired_seg.png", route => route.fulfill({ path: "public/images/matcha_powder_seg.png", contentType: "image/png" }));
});

test("opaque library images stay hidden until automatic segmentation finishes", async ({ page }) => {
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: { matcha_powder: "/assets/opaque.webp" } }));
  await page.route("**/assets/opaque.webp", route => route.fulfill({ path: "public/thumbnails/iced-matcha-latte.webp", contentType: "image/webp" }));
  let requested = false;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/artwork/segment", async route => {
    expect(route.request().postDataJSON().src).toBe("/assets/opaque.webp");
    requested = true;
    await gate;
    await route.fulfill({ json: { src: "/media/repaired_seg.png", segmented: true } });
  });
  await page.goto("/start/iced-matcha-latte");
  await expect.poll(() => requested).toBe(true);
  const ingredient = page.locator(".step-asset").filter({ hasText: "matcha powder" });
  await expect(ingredient.locator("img")).toHaveCount(0);
  await expect(ingredient.locator(".asset-placeholder")).toBeVisible();
  release();
  await expect(ingredient.locator("img")).toHaveAttribute("src", "/media/repaired_seg.png");
  await expect(page.locator(".cooking-scene")).toBeVisible();
});

for (const failed of [false, true]) {
  test(`opaque step result is ${failed ? "kept hidden on repair failure" : "repaired before display"} even with segmented=true`, async ({ page }) => {
    let requested = false;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route("**/api/preparations", route => route.fulfill({ json: {
      id: route.request().postDataJSON().id, status: "complete", message: "Ready", completed: 1, total: 1, warnings: [],
      visuals: allStepVisuals({ 0: { ingredients: [], tools: [], actions: ["whisk"], result: "/media/opaque_seg.png", resultSegmented: true,
        outputs: [{ id: "s1o1", name: "prepared matcha", src: "/media/opaque_seg.png", segmented: true }] } }),
    } }));
    await page.route("**/api/artwork/segment", async route => {
      expect(route.request().postDataJSON().src).toBe("/media/opaque_seg.png");
      requested = true;
      await gate;
      await route.fulfill(failed ? { status: 502, json: { error: "Background removal is incomplete. Please retry." } }
        : { json: { src: "/media/repaired_seg.png", segmented: true } });
    });
    await page.goto("/start/iced-matcha-latte");

    await expect.poll(() => requested).toBe(true);
    await expect(page.locator(".generated-result")).toHaveCount(0);
    await expect(page.locator(".cooking-scene")).toBeVisible();
    release();
    if (failed) {
      await expect(page.getByRole("alert")).toContainText("Background removal is incomplete");
      await expect(page.locator(".generated-result")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Retry illustrations", exact: true })).toBeVisible();
    } else {
      await expect(page.locator(".generated-result")).toHaveAttribute("href", "/media/repaired_seg.png");
      await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    }
  });
}

test("opaque pixels returned by the repair endpoint are still rejected", async ({ page }) => {
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: { matcha_powder: "/assets/opaque.webp" } }));
  await page.route("**/assets/opaque.webp", route => route.fulfill({ path: "public/thumbnails/iced-matcha-latte.webp", contentType: "image/webp" }));
  let requests = 0;
  await page.route("**/api/artwork/segment", route => {
    requests++;
    return route.fulfill({ json: { src: "/media/opaque_seg.png", segmented: true } });
  });
  await page.goto("/start/iced-matcha-latte");
  await expect.poll(() => requests).toBe(1);
  await expect(page.locator(".step-asset img")).toHaveCount(0);
  await expect(page.locator(".cooking-scene")).toBeVisible();
});
