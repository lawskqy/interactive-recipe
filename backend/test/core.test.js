const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const {
  imageReference,
  validateRecipe,
  singleFlight,
  createQueue,
  safeName,
} = require("../core");
const { createApp } = require("../server");
const recipes = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../frontend/public/recipes.json"),
    "utf8",
  ),
);
test("catalog is valid and every cover exists", () => {
  assert.ok(recipes.length >= 23, "The original collection must remain available.");
  assert.equal(new Set(recipes.map((r) => r.id)).size, recipes.length);
  for (const recipe of recipes) {
    validateRecipe(recipe);
    assert.ok(
      fs.existsSync(
        path.join(__dirname, "../../frontend/public/images", recipe.image),
      ),
    );
  }
});
test("references cannot escape approved image directories", () => {
  const dirs = {
    images: path.resolve("images"),
    media: path.resolve("generated"),
  };
  for (const input of [
    "/images/../../../backend/.env",
    "/images/%2e%2e%2fsecret.png",
    "/images/..\\secret.png",
    "/other/a.png",
    "https://example.com/x.png",
    "/images/.env",
    "/media/sub/a.png",
    null,
  ])
    assert.throws(() => imageReference(input, dirs), /Invalid image/);
  assert.equal(
    imageReference("/images/iced-matcha-latte.png", dirs),
    path.join(dirs.images, "iced-matcha-latte.png"),
  );
});
test("invalid recipe edits are rejected before they can replace a recipe", () => {
  for (const patch of [
    { steps: [] },
    { ingredients: [{ name: "milk" }] },
    { portion: -2 },
    { portion: NaN },
    { image: "../secret.png" },
    { category: "unknown" },
  ])
    assert.throws(() => validateRecipe({ ...recipes[0], ...patch }));
});
test("canonical names handle punctuation consistently", () => {
  assert.equal(safeName("non-dairy milk"), "nondairy_milk");
  assert.equal(safeName("maple syrup (foam)"), "maple_syrup_foam");
});
test("concurrent identical work runs once and failures can be retried", async () => {
  const single = singleFlight();
  let calls = 0;
  const job = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 15));
    return "done";
  };
  assert.deepEqual(await Promise.all([single("a", job), single("a", job)]), [
    "done",
    "done",
  ]);
  assert.equal(calls, 1);
  await assert.rejects(
    single("b", async () => {
      throw new Error("failed");
    }),
  );
  assert.equal(await single("b", job), "done");
});
test("generation queue bounds simultaneous jobs and recovers after failure", async () => {
  const queue = createQueue(2);
  let running = 0;
  let peak = 0;
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, (_, index) =>
      queue(async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 5));
        running--;
        if (index === 1) throw new Error("failed");
        return index;
      }),
    ),
  );
  assert.equal(peak, 2);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 4);
});
test("HTTP boundary: malformed requests, origins, cached assets and missing AI config", async (t) => {
  const saved = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  };
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => {
    server.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const base = "http://127.0.0.1:" + server.address().port;
  const post = (route, body, origin) =>
    fetch(base + "/api/" + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(body),
    });
  assert.equal((await fetch(base + "/api/health")).status, 200);
  assert.equal(
    (await post("send-message", {}, "https://untrusted.example")).status,
    403,
  );
  assert.equal((await post("send-message", {})).status, 400);
  assert.equal(
    (
      await post("generate-result-image", {
        step: "Stir",
        index: 1,
        name: "Drink",
        previous: "/images/../../../backend/.env",
      })
    ).status,
    400,
  );
  const cached = await post("generate-and-segment", {
    ingredient: "matcha powder",
  });
  assert.equal(cached.status, 200);
  assert.match((await cached.json()).image_path, /^\/images\//);
  const unavailable = await post("send-message", {
    message: "Hello",
    context: recipes[0],
    previous: [],
  }, "http://127.0.0.1:8080");
  assert.equal(unavailable.status, 503);
  assert.match((await unavailable.json()).error, /not configured/);
  for (let i = 0; i < 31; i++) {
    const response = await post("send-message", {});
    if (i === 30) assert.equal(response.status, 429);
  }
});

test("queued generation expires without blocking later work", async () => {
  const queue = createQueue(1, 2, 10);
  let release;
  const first = queue(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  await assert.rejects(
    queue(async () => "expired"),
    /queue is busy/,
  );
  release("done");
  await first;
  assert.equal(await queue(async () => "next"), "next");
});
