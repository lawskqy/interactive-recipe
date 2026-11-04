import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { allStepVisuals, plannedAction } from "./artwork-fixtures";

const drawn = (body: string, width = 512, height = 512) =>
  sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`)).png().toBuffer();
const stock = (file: string) => sharp(file).png().toBuffer();

const vessels = {
  glass: () => stock("public/images/glass_seg.png"),
  bowl: () => stock("public/images/bowl_seg.png"),
  "small bowl": () => stock("public/images/small_bowl_seg.png"),
  "tall glass": () => drawn('<ellipse cx="256" cy="80" rx="80" ry="14" fill="#cde"/><path d="M176 80H336L320 460H192Z" fill="#cde"/>'),
  mug: () => drawn('<ellipse cx="236" cy="180" rx="120" ry="20" fill="#865"/><path d="M116 180H356V400Q236 430 116 400Z" fill="#865"/><path d="M356 230Q440 250 356 350" stroke="#865" stroke-width="24" fill="none"/>'),
  saucepan: () => drawn('<ellipse cx="200" cy="220" rx="150" ry="24" fill="#444"/><path d="M50 220H350V300Q200 320 50 300Z" fill="#444"/><rect x="350" y="230" width="150" height="20" fill="#444"/>'),
};
const implementsByShape = {
  teaspoon: () => drawn('<rect x="250" y="20" width="12" height="380" fill="#bbb"/><ellipse cx="256" cy="440" rx="30" ry="50" fill="#bbb"/>'),
  "handle-down spoon": () => drawn('<ellipse cx="256" cy="70" rx="34" ry="54" fill="#bbb"/><rect x="250" y="110" width="12" height="380" fill="#bbb"/>'),
  "stubby spoon": () => drawn('<rect x="246" y="150" width="20" height="160" fill="#bbb"/><ellipse cx="256" cy="340" rx="60" ry="50" fill="#bbb"/>'),
};
const actions = [
  { type: "stir", moving: ".stir-motion", vessels: ["glass", "bowl", "small bowl", "tall glass", "mug", "saucepan"] },
  { type: "melt", moving: ".melt-spoon", vessels: ["glass", "bowl", "mug", "saucepan"] },
  { type: "froth", moving: ".frother-motion", vessels: ["glass", "tall glass", "mug"] },
  { type: "whisk", moving: ".whisk-motion", vessels: ["bowl", "small bowl"] },
] as const;

async function visibleBounds(png: Buffer) {
  const image = sharp(png).ensureAlpha();
  const { width, height } = await image.metadata();
  const alpha = await image.extractChannel(3).raw().toBuffer();
  let top = height!, bottom = -1;
  for (let y = 0; y < height!; y++) for (let x = 0; x < width!; x++) if (alpha[y * width! + x] >= 64) {
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return { height: height!, top, bottom: bottom + 1 };
}

for (const action of actions) for (const vesselName of action.vessels) for (const [toolName, drawTool] of Object.entries(implementsByShape)) {
  test(`${action.type} with a ${toolName} stays inside the ${vesselName}`, async ({ page }) => {
    test.skip(test.info().project.name !== "desktop");
    const vessel = await vessels[vesselName]();
    const tool = await drawTool();
    const vesselBounds = await visibleBounds(vessel);
    const plan = {
      ingredients: [{ id: "i1", name: "matcha", appearance: "Green" }],
      tools: [{ id: "t1", name: vesselName, appearance: "Vessel" }, { id: "t2", name: toolName, appearance: "Tool" }],
      steps: Array.from({ length: 6 }, (_, index) => ({ index, inputs: ["i1"], tools: ["t1", "t2"],
        actions: [plannedAction(action.type, ["i1"], { container: "t1", tool: "t2" })],
        outputs: [{ id: `s${index + 1}o1`, name: "result", appearance: "Drink", sourceStep: index }] })),
    };
    const tools = [{ id: "t1", name: vesselName, src: "/media/vessel_seg.png", segmented: true },
      { id: "t2", name: toolName, src: "/media/tool_seg.png", segmented: true }];
    await page.route("**/api/**", route => route.fulfill({ status: 404, json: {} }));
    await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: true } }));
    await page.route("**/asset-manifest.json", route => route.fulfill({ json: {} }));
    await page.route("**/media/vessel_seg.png", route => route.fulfill({ body: vessel, contentType: "image/png" }));
    await page.route("**/media/tool_seg.png", route => route.fulfill({ body: tool, contentType: "image/png" }));
    await page.route("**/api/preparations/*/cancel", route => route.fulfill({ json: { cancelled: true } }));
    await page.route("**/api/preparations", route => route.fulfill({ json: { id: route.request().postDataJSON().id,
      status: "cancelled", message: "Illustration cancelled.", plan, warnings: [], total: 0, completed: 0,
      assets: Object.fromEntries(tools.map(asset => [asset.id, asset])),
      visuals: allStepVisuals({ 0: { ingredients: [], tools, actions: [action.type] } }) } }));
    await page.clock.install();
    await page.goto("/start/iced-matcha-latte");
    await expect(page.locator(`[data-action=${action.type}] .vessel-cutout`).first()).toBeAttached();
    await expect(page.locator(`${action.moving} [data-cutout]`)).toBeAttached();
    await page.getByRole("button", { name: "Play illustration", exact: true }).click();
    let elapsed = 0;
    for (const at of [900, 1600, 2500, 3400]) {
      await page.clock.runFor(at - elapsed);
      elapsed = at;
      const m = await page.locator(".cooking-scene").evaluate((scene, moving) => {
        const vesselRect = scene.querySelector(".vessel-cutout")!.getBoundingClientRect();
        // The viewBox is the visible artwork; find where meet + alignment (+ an
        // optional 180° flip) put its lowest edge inside the placement box.
        const box = scene.querySelector<SVGSVGElement>(`${moving} svg`)!;
        const [x, y, w, h] = (["x", "y", "width", "height"] as const).map(name => box[name].baseVal.value);
        const { width: vbW, height: vbH } = box.viewBox.baseVal;
        const contentH = Math.min(h, w * vbH / vbW);
        const align = box.getAttribute("preserveAspectRatio")!;
        const offset = align.includes("YMax") ? h - contentH : align.includes("YMin") ? 0 : (h - contentH) / 2;
        const flipped = /rotate\(180/.test(box.getAttribute("transform") || "");
        const lowest = flipped ? y + h - offset : y + offset + contentH;
        const motion = scene.querySelector<SVGGraphicsElement>(moving)!;
        const point = new DOMPoint(x + w / 2, lowest);
        // Excluding the motion's own transform gives the resting pose.
        const rest = point.matrixTransform((motion.parentNode as SVGGraphicsElement).getScreenCTM()!);
        const now = point.matrixTransform(motion.getScreenCTM()!);
        return { tip: now.y, rest: rest.y, vessel: { top: vesselRect.top, height: vesselRect.height } };
      }, action.moving);
      const scale = m.vessel.height / vesselBounds.height;
      const vesselBottom = m.vessel.top + vesselBounds.bottom * scale;
      const vesselTop = m.vessel.top + vesselBounds.top * scale;
      expect(m.tip, `tip at ${at}ms`).toBeLessThanOrEqual(vesselBottom - 4);
      expect(m.rest, "resting tip").toBeGreaterThan(vesselTop + 6);
      expect(m.rest, "resting tip").toBeLessThanOrEqual(vesselBottom - 4);
    }
    await page.locator(".illustration-stage").screenshot({ path: `test-results/reach-${action.type}-${vesselName}-${toolName}.png` });
  });
}
