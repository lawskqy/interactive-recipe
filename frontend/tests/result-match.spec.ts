import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { allStepVisuals, plannedAction } from "./artwork-fixtures";

const mug = '<ellipse cx="236" cy="180" rx="120" ry="20" fill="#865"/><path d="M116 180H356V400Q236 430 116 400Z" fill="#865"/>' +
  '<path d="M356 230Q440 250 356 350" stroke="#865" stroke-width="24" fill="none"/>';
const png = (body: string, width: number, height: number) =>
  sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`)).png().toBuffer();
const scale = 1.3, offsetX = 90, offsetY = 140, resultSize = 900;

test("the result takes the size and place of the animated vessel even when foam widens its rim", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop");
  const vessel = await png(mug, 512, 512);
  const result = await png(`<g transform="translate(${offsetX} ${offsetY}) scale(${scale})">${mug}` +
    '<ellipse cx="236" cy="170" rx="160" ry="45" fill="#f4ead2"/></g>', resultSize, resultSize);
  const plan = {
    ingredients: [{ id: "i1", name: "milk", appearance: "Milk" }],
    tools: [{ id: "t1", name: "mug", appearance: "Mug" }],
    steps: Array.from({ length: 6 }, (_, index) => ({ index, inputs: ["i1"], tools: ["t1"],
      actions: [plannedAction("froth", ["i1"], { container: "t1" })],
      outputs: [{ id: `s${index + 1}o1`, name: "frothed milk", appearance: "Foam", sourceStep: index }] })),
  };
  const tools = [{ id: "t1", name: "mug", src: "/media/mug_seg.png", segmented: true }];
  await page.route("**/api/**", route => route.fulfill({ status: 404, json: {} }));
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: true } }));
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: {} }));
  await page.route("**/media/mug_seg.png", route => route.fulfill({ body: vessel, contentType: "image/png" }));
  await page.route("**/media/result_seg.png", route => route.fulfill({ body: result, contentType: "image/png" }));
  await page.route("**/api/preparations", route => route.fulfill({ json: { id: route.request().postDataJSON().id,
    status: "complete", message: "Ready", plan, warnings: [], total: 6, completed: 6,
    assets: Object.fromEntries(tools.map(asset => [asset.id, asset])),
    visuals: allStepVisuals({ 0: { ingredients: [], tools, actions: ["froth"], result: "/media/result_seg.png", resultName: "Frothed milk" } }) } }));
  await page.clock.install();
  await page.goto("/start/iced-matcha-latte");
  const output = page.locator(".generated-result");
  await expect(output).toHaveAttribute("width", /\d{2,}/);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByRole("button", { name: "Replay transformation" }).click();
  await page.clock.runFor(4000);
  const walls = await page.locator(".cooking-scene").evaluate((scene, { scale, offsetX, offsetY, resultSize }) => {
    const v = scene.querySelector(".vessel-cutout")!.getBoundingClientRect();
    const r = scene.querySelector(".generated-result")!.getBoundingClientRect();
    const inVessel = (x: number, y: number) => ({ x: v.left + x / 512 * v.width, y: v.top + y / 512 * v.height });
    const inResult = (x: number, y: number) => ({ x: r.left + (offsetX + x * scale) / resultSize * r.width,
      y: r.top + (offsetY + y * scale) / resultSize * r.height });
    return { vessel: [inVessel(116, 300), inVessel(356, 300)], result: [inResult(116, 300), inResult(356, 300)] };
  }, { scale, offsetX, offsetY, resultSize });
  console.log("WALLS", JSON.stringify(walls));
  for (const side of [0, 1]) {
    expect(Math.abs(walls.result[side].x - walls.vessel[side].x)).toBeLessThan(2);
    expect(Math.abs(walls.result[side].y - walls.vessel[side].y)).toBeLessThan(2);
  }
  await page.locator(".illustration-stage").screenshot({ path: "test-results/result-match.png" });
});
