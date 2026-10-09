import { test, expect } from "@playwright/test";

const matcha = { id: "s1o1", name: "prepared matcha", appearance: "Smooth green matcha in a bowl", sourceStep: 0 };
const base = { id: "s6o1", name: "sparkling blueberry base", appearance: "Purple sparkling drink in a glass", sourceStep: 5 };
const makePlan = () => ({
  ingredients: [{ id: "i1", name: "matcha powder", appearance: "Green powder" }],
  tools: [],
  steps: Array.from({ length: 7 }, (_, index) => ({ index, inputs: index === 6 ? ["s1o1", "s6o1"] : ["i1"],
    tools: [], actions: ["pour"], outputs: [index === 0 ? matcha : index === 5 ? base : {
      id: `s${index + 1}o1`, name: "step result", appearance: "Drink", sourceStep: index,
    }] })),
});
const visuals = {
  0: { ingredients: [], tools: [], actions: ["whisk"], result: "/media/matcha.png", resultName: matcha.name },
  5: { ingredients: [], tools: [], actions: ["pour"], result: "/media/base.png", resultName: base.name },
  6: { ingredients: [{ ...matcha, src: "/media/matcha.png", segmented: true }, { ...base, src: "/media/base.png", segmented: true }],
    tools: [], actions: ["pour"], result: "/media/final.png", resultName: "layered blueberry matcha fizz" },
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { aiConfigured: true } }));
  await page.route("**/media/*.png", (route) => route.fulfill({ path: "public/thumbnails/blueberry-matcha-fizz.webp", contentType: "image/webp" }));
});

test("last step uses prepared matcha and its exact earlier result, with visible dependency progress", async ({ page }) => {
  let id = "";
  let requests = 0;
  let finish = false;
  await page.route("**/api/preparations", (route) => {
    requests++;
    const body = route.request().postDataJSON();
    id = body.id;
    expect(body.recipe.steps).toHaveLength(7);
    expect(body.index).toBe(6);
    return route.fulfill({ json: { id, status: "rendering", message: "Drawing prepared matcha…", completed: 0, total: 7, plan: makePlan(), visuals: {}, warnings: [] } });
  });
  await page.route("**/api/preparations/*", (route) => route.fulfill({ json: {
    id, status: finish ? "complete" : "rendering", message: finish ? "Ready" : "Drawing prepared matcha…", completed: finish ? 7 : 0, total: 7,
    plan: makePlan(), visuals: finish ? visuals : {}, warnings: [],
  } }));
  await page.goto("/start/blueberry-matcha-fizz");
  await page.getByRole("button", { name: "Step 7", exact: true }).click();
  await page.getByRole("button", { name: "Illustrate with AI" }).click();
  await expect(page.getByText("Drawing prepared matcha…")).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute("max", "7");
  await expect(page.locator(".step-assets")).toContainText("prepared matcha");
  await expect(page.locator(".step-assets")).not.toContainText("matcha powder");
  finish = true;
  await expect(page.getByRole("button", { name: "Illustration ready" })).toBeVisible();
  const prepared = page.locator(".step-asset").filter({ hasText: "prepared matcha" });
  await expect(prepared).toContainText("From step 1");
  await expect(prepared.locator("img")).toHaveAttribute("src", "/media/matcha.png");
  await page.getByRole("button", { name: "Step 1", exact: true }).click();
  await expect(page.locator(".generated-result")).toHaveAttribute("src", "/media/matcha.png");
  await page.getByRole("button", { name: "Step 7", exact: true }).click();
  await expect(prepared.locator("img")).toHaveAttribute("src", "/media/matcha.png");
  expect(requests).toBe(1);
});

test("cancelling a preparation stops polling and allows a fresh request", async ({ page }) => {
  let requests = 0;
  let polls = 0;
  let cancelled = "";
  await page.route("**/api/preparations", (route) => {
    requests++;
    return route.fulfill({ json: { id: route.request().postDataJSON().id, status: "planning", message: "Planning preparations…", completed: 0, total: 0, visuals: {}, warnings: [] } });
  });
  await page.route("**/api/preparations/*", (route) => {
    polls++;
    return route.fulfill({ json: { id: route.request().url().split("/").pop(), status: "planning", message: "Planning preparations…", completed: 0, total: 0, visuals: {}, warnings: [] } });
  });
  await page.route("**/api/preparations/*/cancel", (route) => {
    cancelled = route.request().url();
    return route.fulfill({ json: { cancelled: true } });
  });
  await page.goto("/start/blueberry-matcha-fizz");
  await page.getByRole("button", { name: "Illustrate with AI" }).click();
  await expect(page.getByText("Planning preparations…")).toBeVisible();
  await page.getByRole("button", { name: "Cancel illustration" }).click();
  await expect.poll(() => cancelled).toContain("/cancel");
  const stopped = polls;
  await page.waitForTimeout(1300);
  expect(polls).toBe(stopped);
  await page.getByRole("button", { name: "Illustrate with AI" }).click();
  await expect.poll(() => requests).toBe(2);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".preparation-progress")).toHaveCount(0);
});

test("failed jobs retain earlier results and log background-removal fallbacks", async ({ page }) => {
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning") warnings.push(message.text());
  });
  await page.route("**/api/preparations/*/cancel", (route) => route.fulfill({ json: { cancelled: true } }));
  let attempt = 0;
  await page.route("**/api/preparations", (route) => route.fulfill({ json: {
    id: route.request().postDataJSON().id, status: ++attempt === 1 ? "error" : "complete", message: "Ready",
    error: "Image generation is temporarily unavailable.", completed: attempt === 1 ? 1 : 7, total: 7,
    plan: makePlan(), visuals: attempt === 1 ? { 0: visuals[0] } : visuals,
    warnings: ["Background removal is not configured. New illustrations are shown with their backgrounds."],
  } }));
  await page.goto("/start/blueberry-matcha-fizz");
  await page.getByRole("button", { name: "Step 7", exact: true }).click();
  await page.getByRole("button", { name: "Illustrate with AI" }).click();
  await expect(page.getByRole("alert")).toContainText("temporarily unavailable");
  await page.getByRole("button", { name: "Step 1", exact: true }).click();
  await expect(page.locator(".generated-result")).toHaveAttribute("src", "/media/matcha.png");
  await page.getByRole("button", { name: "Step 7", exact: true }).click();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Illustration ready" })).toBeVisible();
  await expect(page.getByText("Background removal is not configured", { exact: false })).toHaveCount(0);
  expect(warnings.some((warning) => warning.includes("Background removal is not configured"))).toBe(true);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
