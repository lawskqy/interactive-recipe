import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { plannedAction } from "./artwork-fixtures";

const glass = '<ellipse cx="256" cy="110" rx="90" ry="14" fill="#cde"/><path d="M166 110H346L326 440H186Z" fill="#cde"/>';
const png = (body: string) =>
  sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${body}</svg>`)).png().toBuffer();

test("the same glass keeps one size and place across steps with differently sized animations", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop");
  const vessel = await png(glass);
  const result = await png(glass + '<rect x="190" y="200" width="132" height="230" fill="#8d9d65"/>');
  // Step 1 pours into the glass (cup-sized scene); step 2 whisks the step-1
  // mixture, so its container is that preparation (bowl-sized scene); step 3
  // sifts straight into the glass (bowl-sized scene).
  const steps = [
    [plannedAction("pour", ["i1"], { container: "t1" })],
    [plannedAction("whisk", ["s1o1"], { container: "s1o1" })],
    [plannedAction("sift", ["s2o1"], { container: "t1" })],
  ];
  const plan = {
    ingredients: [{ id: "i1", name: "milk", appearance: "Milk" }],
    tools: [{ id: "t1", name: "glass", appearance: "Glass" }],
    steps: Array.from({ length: 6 }, (_, index) => ({ index, inputs: index ? [`s${index}o1`] : ["i1"], tools: index === 1 ? [] : ["t1"],
      actions: steps[index] || steps[0], outputs: [{ id: `s${index + 1}o1`, name: `mixture ${index + 1}`, appearance: "Drink", sourceStep: index }] })),
  };
  const tools = [{ id: "t1", name: "glass", src: "/media/glass_seg.png", segmented: true }];
  const visual = (index: number) => ({ ingredients: index ? [{ id: `s${index}o1`, name: `mixture ${index}`, src: "/media/result_seg.png",
    segmented: true, sourceStep: index - 1 }] : [{ id: "i1", name: "milk" }], tools: index === 1 ? [] : tools, actions: (steps[index] || steps[0]).map(a => a.type),
    result: "/media/result_seg.png", resultName: `mixture ${index + 1}` });
  await page.route("**/api/**", route => route.fulfill({ status: 404, json: {} }));
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: true } }));
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: {} }));
  await page.route("**/media/glass_seg.png", route => route.fulfill({ body: vessel, contentType: "image/png" }));
  await page.route("**/media/result_seg.png", route => route.fulfill({ body: result, contentType: "image/png" }));
  await page.route("**/api/preparations", route => route.fulfill({ json: { id: route.request().postDataJSON().id,
    status: "complete", message: "Ready", plan, warnings: [], total: 6, completed: 6,
    assets: Object.fromEntries(tools.map(asset => [asset.id, asset])),
    visuals: Object.fromEntries(Array.from({ length: 6 }, (_, index) => [index, visual(index)])) } }));
  await page.clock.install();
  await page.goto("/start/iced-matcha-latte");
  const shown = [];
  for (const index of [0, 1, 2]) {
    await page.getByRole("button", { name: `Step ${index + 1}`, exact: true }).click();
    await expect(page.locator(".generated-result")).toHaveAttribute("width", /\d{2,}/);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.getByRole("button", { name: "Replay transformation" }).click();
    await page.clock.runFor(6000);
    await expect(page.locator(".generated-result")).toHaveCSS("opacity", "1");
    shown.push(await page.locator(".generated-result").evaluate(element => {
      const stage = element.closest(".illustration-stage")!.getBoundingClientRect();
      const { x, width, bottom } = element.getBoundingClientRect();
      return { x: x - stage.x, width, bottom: bottom - stage.y };
    }));
    await page.locator(".illustration-stage").screenshot({ path: `test-results/vessel-size-step-${index + 1}.png` });
  }
  console.log("SHOWN", JSON.stringify(shown));
  for (const later of shown.slice(1)) for (const key of ["x", "width", "bottom"] as const)
    expect(Math.abs(later[key] - shown[0][key]), key).toBeLessThan(1.5);
});
