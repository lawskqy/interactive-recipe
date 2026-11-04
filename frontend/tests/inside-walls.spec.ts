import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { allStepVisuals, plannedAction } from "./artwork-fixtures";

const svg = (body: string) =>
  sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">${body}</svg>`)).png().toBuffer();
const stock = (file: string) => sharp(file).png().toBuffer();

// Walls are the vessel's own outline at an image row, excluding any handle.
type Walls = (y: number) => [number, number] | undefined;
const fromAlpha = async (png: Buffer): Promise<Walls> => {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return (y) => {
    const row = Math.round(y);
    let left = -1, right = -1;
    for (let x = 0; x < info.width; x++) if (data[(row * info.width + x) * 4 + 3] >= 64) { if (left < 0) left = x; right = x; }
    return left < 0 ? undefined : [left, right + 1];
  };
};
const vessels: Record<string, () => Promise<{ png: Buffer; walls: Walls }>> = {
  // A high handle that widens the top rows on one side only.
  mug: async () => ({ png: await svg('<ellipse cx="236" cy="150" rx="100" ry="16" fill="#865"/><path d="M136 150H336V420Q236 445 136 420Z" fill="#865"/>' +
    '<path d="M336 165Q450 175 336 300" stroke="#865" stroke-width="22" fill="none"/>'),
    walls: (y) => y >= 150 && y <= 420 ? [136, 336] : undefined }),
  // Much narrower at the floor than at the rim.
  "tapered glass": async () => ({ png: await svg('<ellipse cx="256" cy="80" rx="100" ry="14" fill="#cde"/><path d="M156 80H356L306 460H206Z" fill="#cde"/>'),
    walls: (y) => y >= 80 && y <= 460 ? [156 + (y - 80) * 50 / 380, 356 - (y - 80) * 50 / 380] : undefined }),
  glass: async () => { const png = await stock("public/images/glass_seg.png"); return { png, walls: await fromAlpha(png) }; },
  bowl: async () => { const png = await stock("public/images/bowl_seg.png"); return { png, walls: await fromAlpha(png) }; },
};
const spoon = () => svg('<rect x="250" y="20" width="12" height="380" fill="#bbb"/><ellipse cx="256" cy="440" rx="30" ry="50" fill="#bbb"/>');
const whisk = () => svg('<rect x="248" y="20" width="16" height="240" fill="#b8955c"/><ellipse cx="256" cy="380" rx="60" ry="120" fill="none" stroke="#c5a878" stroke-width="10"/>');
const tools = [
  { type: "stir", moving: ".stir-motion", tool: spoon, head: 30, vessels: ["mug", "tapered glass", "glass", "bowl"] },
  { type: "melt", moving: ".melt-spoon", tool: spoon, head: 30, vessels: ["mug", "tapered glass", "bowl"] },
  { type: "whisk", moving: ".whisk-motion", tool: whisk, head: 65, vessels: ["bowl"] },
];
const pieces = [
  { type: "add-ice", selector: ".ice-cube", vessels: ["mug", "tapered glass", "glass"] },
  { type: "add-pieces", selector: ".piece-drop", vessels: ["mug", "tapered glass", "glass", "bowl"] },
  { type: "mash", selector: ".mash-piece", vessels: ["mug", "tapered glass", "glass", "bowl"] },
];

async function open(page: import("@playwright/test").Page, type: string, vessel: Buffer, tool?: Buffer) {
  const plan = {
    ingredients: [{ id: "i1", name: "matcha", appearance: "Green" }],
    tools: [{ id: "t1", name: "vessel", appearance: "Vessel" }, ...(tool ? [{ id: "t2", name: "tool", appearance: "Tool" }] : [])],
    steps: Array.from({ length: 6 }, (_, index) => ({ index, inputs: ["i1"], tools: tool ? ["t1", "t2"] : ["t1"],
      actions: [plannedAction(type, ["i1"], { container: "t1", tool: tool ? "t2" : "" })],
      outputs: [{ id: `s${index + 1}o1`, name: "result", appearance: "Drink", sourceStep: index }] })),
  };
  const assets = [{ id: "t1", name: "vessel", src: "/media/vessel_seg.png", segmented: true },
    ...(tool ? [{ id: "t2", name: "tool", src: "/media/tool_seg.png", segmented: true }] : [])];
  await page.route("**/api/**", route => route.fulfill({ status: 404, json: {} }));
  await page.route("**/api/health", route => route.fulfill({ json: { aiConfigured: true } }));
  await page.route("**/asset-manifest.json", route => route.fulfill({ json: {} }));
  await page.route("**/media/vessel_seg.png", route => route.fulfill({ body: vessel, contentType: "image/png" }));
  if (tool) await page.route("**/media/tool_seg.png", route => route.fulfill({ body: tool, contentType: "image/png" }));
  await page.route("**/api/preparations/*/cancel", route => route.fulfill({ json: { cancelled: true } }));
  await page.route("**/api/preparations", route => route.fulfill({ json: { id: route.request().postDataJSON().id,
    status: "cancelled", message: "Illustration cancelled.", plan, warnings: [], total: 0, completed: 0,
    assets: Object.fromEntries(assets.map(asset => [asset.id, asset])),
    visuals: allStepVisuals({ 0: { ingredients: [], tools: assets, actions: [type] } }) } }));
  await page.clock.install();
  await page.goto("/start/iced-matcha-latte");
  await expect(page.locator(`[data-action=${type}] .vessel-cutout`).first()).toBeAttached();
}

// Screen → vessel image coordinates.
const toImage = (rect: { left: number; top: number; width: number; height: number }, size: { width: number; height: number }) =>
  (x: number, y: number) => ({ x: (x - rect.left) / rect.width * size.width, y: (y - rect.top) / rect.height * size.height });

for (const { type, moving, tool, head, vessels: names } of tools) for (const name of names) {
  test(`${type} keeps the tool head between the walls of the ${name}`, async ({ page }) => {
    test.skip(test.info().project.name !== "desktop");
    const { png, walls } = await vessels[name]();
    await open(page, type, png, await tool());
    await expect(page.locator(`${moving} [data-cutout]`)).toBeAttached();
    await page.getByRole("button", { name: "Play illustration", exact: true }).click();
    let elapsed = 0;
    for (const at of [1000, 1350, 1700, 2100, 2500, 2900, 3300]) {
      await page.clock.runFor(at - elapsed);
      elapsed = at;
      const m = await page.locator(".cooking-scene").evaluate((scene, { moving, head }) => {
        const vessel = scene.querySelector(".vessel-cutout")!.getBoundingClientRect();
        const box = scene.querySelector<SVGSVGElement>(`${moving} svg`)!;
        const [x, y, w, h] = (["x", "y", "width", "height"] as const).map(key => box[key].baseVal.value);
        const { width: vbW, height: vbH } = box.viewBox.baseVal;
        const contentScale = Math.min(h / vbH, w / vbW);
        const ctm = (box.parentNode as SVGGraphicsElement).getScreenCTM()!;
        const tip = new DOMPoint(x + w / 2, y + h).matrixTransform(ctm);
        const halfHead = head * contentScale * Math.hypot(ctm.a, ctm.b);
        return { tip: { x: tip.x, y: tip.y }, halfHead, vessel: { left: vessel.left, top: vessel.top, width: vessel.width, height: vessel.height } };
      }, { moving, head });
      const map = toImage(m.vessel, await sharp(png).metadata() as { width: number; height: number });
      const left = map(m.tip.x - m.halfHead, m.tip.y), right = map(m.tip.x + m.halfHead, m.tip.y);
      const at_ = walls(left.y);
      expect(at_, `tip row inside the vessel at ${at}ms`).toBeTruthy();
      expect(left.x, `left of head at ${at}ms`).toBeGreaterThanOrEqual(at_![0] - 1);
      expect(right.x, `right of head at ${at}ms`).toBeLessThanOrEqual(at_![1] + 1);
    }
    await page.locator(".illustration-stage").screenshot({ path: `test-results/walls-${type}-${name}.png` });
  });
}

for (const { type, selector, vessels: names } of pieces) for (const name of names) {
  test(`${type} keeps every piece between the walls of the ${name}`, async ({ page }) => {
    test.skip(test.info().project.name !== "desktop");
    const { png, walls } = await vessels[name]();
    await open(page, type, png);
    await page.getByRole("button", { name: "Play illustration", exact: true }).click();
    await page.clock.runFor(3600);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const m = await page.locator(".cooking-scene").evaluate((scene, selector) => {
      const vessel = scene.querySelector(".vessel-cutout")!.getBoundingClientRect();
      return { vessel: { left: vessel.left, top: vessel.top, width: vessel.width, height: vessel.height },
        pieces: [...scene.querySelectorAll(selector)].map(piece => { const r = piece.getBoundingClientRect(); return { left: r.left, right: r.right, y: r.top + r.height / 2 }; }) };
    }, selector);
    expect(m.pieces.length).toBeGreaterThan(0);
    const map = toImage(m.vessel, await sharp(png).metadata() as { width: number; height: number });
    for (const [i, piece] of m.pieces.entries()) {
      const left = map(piece.left, piece.y), right = map(piece.right, piece.y);
      const at = walls(left.y);
      expect(at, `piece ${i} row inside the vessel`).toBeTruthy();
      expect(left.x, `piece ${i} left`).toBeGreaterThanOrEqual(at![0] - 1);
      expect(right.x, `piece ${i} right`).toBeLessThanOrEqual(at![1] + 1);
    }
    await page.locator(".illustration-stage").screenshot({ path: `test-results/walls-${type}-${name}.png` });
  });
}
