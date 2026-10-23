import { test, expect } from "@playwright/test";
import { allStepVisuals } from "./artwork-fixtures";
import sharp from "sharp";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: false } }));
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: { bowl: "/assets/bowl.webp" } }));
});

test("sifted matcha stays inside the actual bowl opening and behind its front rim", async ({ page }) => {
  await page.clock.install();
  await page.goto("/start/pumpkin-spice-maple-matcha-latte");
  await expect(page.locator(".vessel-cutout").first()).toBeVisible();
  await expect(page.locator(".step-assets")).not.toContainText("pumpkin spice");
  await page.getByRole("button", { name: "Play illustration", exact: true }).click();
  await page.clock.runFor(3900);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const bounds = await page.locator(".cooking-scene").evaluate(scene => {
    const bowl = scene.querySelector(".vessel-cutout")!.getBoundingClientRect();
    const powder = scene.querySelector(".powder-pile")!.getBoundingClientRect();
    // Measured inner rim in the bundled 1024px bowl drawing, independent of
    // the layout estimator: approximately x=200..825, y=290..395.
    return { left: powder.left, right: powder.right, top: powder.top, bottom: powder.bottom,
      innerLeft: bowl.left + bowl.width * 200 / 1024,
      innerRight: bowl.left + bowl.width * 825 / 1024,
      innerTop: bowl.top + bowl.height * 290 / 1024,
      innerBottom: bowl.top + bowl.height * 395 / 1024 };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(bounds.innerLeft - 2);
  expect(bounds.right).toBeLessThanOrEqual(bounds.innerRight + 2);
  expect(bounds.top).toBeGreaterThanOrEqual(bounds.innerTop - 2);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.innerBottom + 2);
  await expect(page.locator(".contents-mask")).toHaveAttribute("clip-path", /surface/);
  await expect(page.locator(".vessel-front .vessel-cutout")).toBeVisible();
  await page.locator(".illustration-stage").screenshot({ path: `test-results/aligned-sift-${test.info().project.name}.png` });
});

test("the result blends in during sifting in the same place despite different image margins", async ({ page }) => {
  // A controlled result fixture retains the real bowl, adds green contents,
  // and deliberately changes the surrounding transparent margins.
  const result = await sharp("public/images/bowl_seg.png").composite([{ input: Buffer.from(
    '<svg width="1024" height="1024"><ellipse cx="512" cy="342" rx="280" ry="42" fill="#8d9d65"/></svg>'),
  }]).png().toBuffer();
  const padded = await sharp(result).trim().extend({ top: 31, bottom: 91, left: 140, right: 20,
    background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await page.route("**/api/preparation-assets", route => route.fulfill({ json: { status: "complete", assets: {}, visuals: {}, warnings: [] } }));
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: true } }));
  await page.route("**/media/sift-result.png", route => route.fulfill({ body: padded, contentType: "image/png" }));
  await page.route("**/api/preparations", route => route.fulfill({ json: { status: "complete", warnings: [], visuals: allStepVisuals({
    0: { ingredients: [], tools: [{ name: "bowl", src: "/images/bowl_seg.png" }], actions: ["sift"],
      result: "/media/sift-result.png", resultName: "Sifted matcha" },
  }, 7) } }));
  await page.clock.install();
  await page.goto("/start/pumpkin-spice-maple-matcha-latte");

  const output = page.locator(".generated-result");
  const positionInScene = () => output.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const scene = element.closest(".cooking-scene")!.getBoundingClientRect();
    return { x: bounds.x - scene.x, y: bounds.y - scene.y, width: bounds.width, height: bounds.height };
  });
  const expectSamePosition = async (before: Awaited<ReturnType<typeof positionInScene>>) => {
    const after = await positionInScene();
    for (const key of ["x", "y", "width", "height"] as const) expect(after[key]).toBeCloseTo(before[key], 2);
  };
  await expect(output).toHaveAttribute("width", /\d{2,}/);
  // Layout measurement is asynchronous. Start a fresh controlled playback
  // after it settles, so slow image decoding cannot consume the first beat.
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Replay transformation" }).click();
  await expect(output).toHaveCSS("opacity", "0");
  await page.clock.runFor(700);
  await expect(output).toHaveCSS("opacity", "0");
  const position = await positionInScene();
  await page.clock.runFor(1800);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".sieve-motion")).toBeVisible();
  const opacity = Number(await output.evaluate(element => getComputedStyle(element).opacity));
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  await expectSamePosition(position);
  await page.locator(".illustration-stage").screenshot({ path: `test-results/sift-transition-${test.info().project.name}.png` });
  await page.clock.runFor(1000);
  expect(Number(await output.evaluate(element => getComputedStyle(element).opacity))).toBe(opacity);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(4000);
  await expect(output).toHaveCSS("opacity", "1");
  await expectSamePosition(position);
  await expect(page.locator(".receiver-content")).toHaveCSS("opacity", "0");
  await expect(page.getByText("Sifted matcha", { exact: true })).toBeVisible();
  await page.locator(".illustration-stage").screenshot({ path: `test-results/sift-result-${test.info().project.name}.png` });
  await page.getByRole("button", { name: "Replay transformation" }).click();
  await expect(output).toHaveCSS("opacity", "0");
  await expectSamePosition(position);
});
