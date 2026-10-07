import { test, expect } from "@playwright/test";
import recipes from "../public/recipes.json" with { type: "json" };
test.beforeEach(async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { aiConfigured: false } }));
});
test("collection filters, search, keyboard dialog and restored artwork", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".recipe-tile")).toHaveCount(recipes.length);
  await expect(page.locator(".recipe-tile img").first()).toHaveJSProperty(
    "naturalWidth",
    480,
  );
  await page.getByRole("button", { name: "Cold", exact: true }).click();
  await expect(page.locator(".temperature-badge").first()).toHaveText("Cold");
  await page.getByRole("searchbox").fill("blueberry");
  await expect(page.locator(".recipe-tile")).toHaveCount(1);
  await page.locator(".recipe-tile").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".recipe-tile")).toBeFocused();
  await page.getByRole("searchbox").fill("nothing-matches");
  await expect(page.getByText("No cups found just yet.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".recipe-tile")).toHaveCount(recipes.length);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("missing covers stop retrying and keep the recipe usable", async ({
  page,
}) => {
  const recipe = recipes[0];
  let originalRequests = 0;
  await page.route(`**/thumbnails/${recipe.id}.webp`, (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.route(`**/images/${recipe.image}`, (route) => {
    originalRequests++;
    return route.fulfill({ status: 404, body: "" });
  });
  await page.goto("/");
  const tile = page.locator(".recipe-tile").first();
  const cover = tile.locator("img");
  await expect(cover).toHaveAttribute(
    "src",
    /recipe-placeholder.*\.svg|^data:image\/svg\+xml,/,
  );
  await expect(cover).toHaveJSProperty("naturalWidth", 480);
  await page.getByRole("searchbox").fill(recipe.name);
  await page.waitForTimeout(500);
  expect(originalRequests).toBe(1);

  await tile.click();
  const preview = page.getByRole("dialog");
  await expect(preview.locator("img")).toHaveAttribute(
    "src",
    /recipe-placeholder.*\.svg|^data:image\/svg\+xml,/,
  );
  await expect(preview.locator("img")).toHaveJSProperty("naturalWidth", 480);
  await page.waitForTimeout(500);
  expect(originalRequests).toBe(2);
  await preview.getByRole("button", { name: /make it/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(recipe.name);
});

test("missing thumbnails fall back to the original artwork", async ({
  page,
}) => {
  const recipe = recipes[0];
  await page.route(`**/thumbnails/${recipe.id}.webp`, (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.route(`**/images/${recipe.image}`, (route) =>
    route.fulfill({
      path: `public/thumbnails/${recipe.id}.webp`,
      contentType: "image/webp",
    }),
  );
  await page.goto("/");
  const tile = page.locator(".recipe-tile").first();
  await expect(tile.locator("img")).toHaveAttribute(
    "src",
    `/images/${recipe.image}`,
  );
  await expect(tile.locator("img")).toHaveJSProperty("naturalWidth", 480);
  await tile.click();
  const cover = page.getByRole("dialog").locator("img");
  await expect(cover).toHaveAttribute("src", `/images/${recipe.image}`);
  await expect(cover).toHaveJSProperty("naturalWidth", 480);
});

test("recipe works without AI, navigation and accessible controls", async ({
  page,
}) => {
  await page.goto("/start/iced-matcha-latte");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "iced matcha latte",
  );
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".step-counter")).toHaveText("Step 2 of 6");
  await page.getByRole("button", { name: "Step 6", exact: true }).click();
  await expect(page.getByText("Your cup is ready. Enjoy ♡")).toHaveCount(0);
  await expect(page.getByText("0 of 6 steps completed")).toBeVisible();
  await page.getByRole("checkbox").first().check();
  await expect(page.getByRole("checkbox").first()).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/recipe-" + test.info().project.name + ".png",
    fullPage: false,
  });
});
test("AI failure stays bounded and retry is explicit", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/generate-result-image", (route) => {
    calls++;
    return route.fulfill({
      status: 503,
      json: { error: "Illustration unavailable." },
    });
  });
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("button", { name: "Illustrate with AI" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Illustration unavailable.",
  );
  await page.waitForTimeout(500);
  expect(calls).toBe(1);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect.poll(() => calls).toBe(2);
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
test("chat edits reset the selected step and undo restores the original", async ({
  page,
}) => {
  await page.route("**/api/send-message", async (route) => {
    const request = route.request().postDataJSON();
    await route.fulfill({
      json: {
        reply: "I simplified your recipe.",
        recipe: {
          ...request.context,
          name: "simple matcha",
          steps: ["Whisk the matcha.", "Add milk and enjoy."],
        },
      },
    });
  });
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("button", { name: "Step 6", exact: true }).click();
  await page.getByRole("tab", { name: "Ask the companion" }).click();
  await page
    .getByLabel("Message your café companion")
    .fill("Simplify this recipe");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("iced matcha latte");
  await page.getByRole("button", { name: "Yes, apply changes" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "simple matcha",
  );
  await expect(page.locator(".step-counter")).toHaveText("Step 1 of 2");
  await page.getByRole("button", { name: "Undo change" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "iced matcha latte",
  );
  await expect(page.locator(".step-counter")).toHaveText("Step 1 of 6");
});
test("invalid AI recipe is rejected and duplicate sends are prevented", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/send-message", async (route) => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ json: { reply: "Changed", recipe: { steps: [] } } });
  });
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("tab", { name: "Ask the companion" }).click();
  await page.getByLabel("Message your café companion").fill("Change it");
  await page.getByLabel("Message your café companion").press("Enter");
  await page.getByLabel("Message your café companion").fill("Another change");
  await page.getByLabel("Message your café companion").press("Enter");
  await expect(page.getByRole("alert")).toContainText("incomplete");
  expect(calls).toBe(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "iced matcha latte",
  );
});
test("leaving a pending illustration does not overwrite the next step or block retry", async ({
  page,
}) => {
  await page.route("**/api/generate-result-image", async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route
      .fulfill({ json: { image_path: "/images/iced-matcha-latte.png" } })
      .catch(() => {});
  });
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("button", { name: "Illustrate with AI" }).click();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.locator(".step-counter")).toHaveText("Step 2 of 6");
  await page.waitForTimeout(500);
  await expect(page.locator(".generated-result")).toHaveCount(0);
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(
    page.getByRole("button", { name: "Illustrate with AI" }),
  ).toBeEnabled();
});
test("reduced motion keeps the tutorial static and missing recipes recover", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/start/iced-matcha-latte");
  await expect(page.getByText("Still view · reduced motion")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play illustration" }),
  ).toHaveCount(0);
  await page.goto("/start/missing");
  await expect(page.getByRole("heading")).toContainText("could not be found");
});

test("illustration playback can pause and reset without a stale timer", async ({
  page,
}) => {
  await page.goto("/start/iced-matcha-latte");
  await page.getByRole("button", { name: "Play illustration" }).click();
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(350);
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await expect(page.locator(".action-scene")).not.toHaveClass(/is-playing/);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play illustration" }),
  ).toBeVisible();
  await expect(page.locator(".action-scene")).toHaveCount(0);
});

test("collection and recipe pass automated accessibility checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  await expect(page.locator(".recipe-tile")).toHaveCount(recipes.length);
  await expect(page.locator(".recipe-tile img").first()).toHaveJSProperty(
    "naturalWidth",
    480,
  );
  await page.screenshot({
    path: "test-results/collection-" + test.info().project.name + ".png",
    fullPage: false,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.locator(".recipe-tile").first().click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: /make it/ }).click();
  await expect(page.locator(".recipe-sheet")).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("tab", { name: "Ask the companion" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
