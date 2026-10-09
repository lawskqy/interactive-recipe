const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { createPreparation, validatePlan, dependencyOrder } = require("../preparation");
const { createApp } = require("../server");
const recipe = require("../../frontend/public/recipes.json").find((item) => item.id === "blueberry-matcha-fizz");
const inputs = [["i1", "i3"], ["i2"], ["s2o1", "i4", "i5"], ["s3o1", "i7"], ["s4o1", "i7"], ["s5o1", "i6"], ["s1o1", "s6o1"]];
const names = ["prepared matcha", "muddled blueberries", "blueberry lemon mixture", "chilled blueberry mixture", "strained blueberry base", "sparkling blueberry base", "layered blueberry matcha fizz"];
const makePlan = () => ({
  ingredients: recipe.ingredients.map((item, index) => ({ id: `i${index + 1}`, appearance: item.name })),
  tools: [{ id: "t1", name: "whisk", appearance: "Bamboo whisk" }],
  steps: inputs.map((refs, index) => ({ inputs: [...refs], tools: index === 0 ? ["t1"] : [], actions: [index === 0 ? "whisk" : "pour"],
    outputs: [{ id: `s${index + 1}o1`, name: names[index], appearance: names[index] + " in its glass or bowl" }] })),
});
async function finished(service, id) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const job = service.get(id);
    if (["complete", "error", "cancelled"].includes(job.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Job did not finish");
}
const fakeRender = async ({ item }) => ({ src: `/media/${item.id}.png`, segmented: true });

test("whole-recipe plan retains a set-aside branch and rejects broken references", () => {
  const plan = validatePlan(makePlan(), recipe);
  assert.deepEqual(dependencyOrder(plan, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(dependencyOrder(plan, 6), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plan.steps[6].inputs, ["s1o1", "s6o1"]);
  for (const change of [
    (value) => value.steps[0].inputs.push("s7o1"),
    (value) => value.steps[0].inputs.push("s1o1"),
    (value) => value.steps[1].inputs.push("unknown"),
    (value) => value.steps[0].inputs.push("i1"),
    (value) => { value.steps[1].outputs[0].id = "s1o1"; },
    (value) => { value.ingredients[1].id = "i1"; },
    (value) => value.steps.pop(),
    (value) => value.steps[0].tools.push("t99"),
  ]) {
    const invalid = makePlan();
    change(invalid);
    assert.throws(() => validatePlan(invalid, recipe), /Invalid preparation plan/);
  }
});

test("final-step request renders dependencies in order and reuses exact prepared artwork", async () => {
  const calls = [];
  let plans = 0;
  const service = createPreparation({ generate: async () => { plans++; return { text: JSON.stringify(makePlan()) }; },
    render: async (request) => { calls.push(request); return fakeRender(request); } });
  const job = await finished(service, service.start(recipe, 6).id);
  assert.equal(job.status, "complete");
  assert.deepEqual(calls.filter((call) => call.kind === "result").map((call) => call.step.index), [0, 1, 2, 3, 4, 5, 6]);
  const final = calls.find((call) => call.item.id === "s7o1");
  assert.deepEqual(final.references.map((item) => item.src), ["/media/s1o1.png", "/media/s6o1.png"]);
  assert.deepEqual(job.visuals[6].ingredients.map((item) => item.name), ["prepared matcha", "sparkling blueberry base"]);
  assert.equal(job.visuals[6].ingredients[0].sourceStep, 0);
  assert.equal(job.visuals[6].ingredients[0].src, job.visuals[0].result);
  const count = calls.length;
  assert.equal((await finished(service, service.start(recipe, 6).id)).status, "complete");
  assert.equal(calls.length, count);
  assert.equal(plans, 1);
  const changed = { ...recipe, steps: recipe.steps.map((step, index) => index === 0 ? step + " Use a white bowl." : step) };
  await finished(service, service.start(changed, 0).id);
  assert.equal(plans, 2);
});

test("invalid AI plans get one correction attempt and never reach artwork unchecked", async () => {
  let calls = 0;
  const service = createPreparation({ generate: async (request) => {
    calls++;
    if (calls === 1) return { text: "{}" };
    assert.match(request.contents, /correction/);
    return { text: JSON.stringify(makePlan()) };
  }, render: fakeRender });
  assert.equal((await finished(service, service.start(recipe, 0).id)).status, "complete");
  assert.equal(calls, 2);
  const broken = createPreparation({ generate: async () => ({ text: "{}" }), render: () => assert.fail("Unvalidated plan reached image generation") });
  assert.equal((await finished(broken, broken.start(recipe, 0).id)).status, "error");
});

test("partial progress survives failure and retry reuses completed preparations", async () => {
  let failOnce = true;
  const rendered = [];
  const service = createPreparation({ generate: async () => ({ text: JSON.stringify(makePlan()) }), render: async (request) => {
    if (request.item.id === "s3o1" && failOnce) { failOnce = false; throw new Error("Private provider details"); }
    rendered.push(request.item.id);
    return fakeRender(request);
  } });
  const first = await finished(service, service.start(recipe, 6).id);
  assert.equal(first.status, "error");
  assert.equal(first.completed, 2);
  assert.doesNotMatch(first.error, /Private/);
  assert.ok(first.visuals[0]);
  const retry = await finished(service, service.start(recipe, 6).id);
  assert.equal(retry.status, "complete");
  assert.equal(rendered.filter((id) => id === "s1o1").length, 1);
});

test("cancellation stops subsequent generation, including cancellation racing the start request", async () => {
  let release;
  let started;
  const entered = new Promise((resolve) => { started = resolve; });
  let calls = 0;
  const service = createPreparation({ generate: async () => ({ text: JSON.stringify(makePlan()) }), render: async (request) => {
    calls++;
    started();
    await new Promise((resolve) => { release = resolve; });
    return fakeRender(request);
  } });
  const id = service.start(recipe, 6).id;
  await entered;
  service.cancel(id);
  release();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(service.get(id).status, "cancelled");
  assert.equal(calls, 1);
  const early = randomUUID();
  service.cancel(early);
  assert.throws(() => service.start(recipe, 0, early), /cancelled/);
});

test("unobserved jobs stop after their lease instead of generating the rest of a recipe", async () => {
  let time = 0;
  let calls = 0;
  const service = createPreparation({ now: () => time, generate: async () => ({ text: JSON.stringify(makePlan()) }), render: async (request) => {
    calls++;
    time = 120001;
    return fakeRender(request);
  } });
  const id = service.start(recipe, 6).id;
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(service.get(id).status, "cancelled");
  assert.equal(calls, 1);
});

test("preparation HTTP API validates inputs, reports progress and keeps provider errors private", async (t) => {
  const server = createApp({ generate: async () => ({ text: JSON.stringify(makePlan()) }), artwork: { render: fakeRender } }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api/preparations`;
  const post = (body, suffix = "") => fetch(base + suffix, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await post({ recipe, index: -1 })).status, 400);
  const id = randomUUID();
  assert.equal((await post({ recipe, index: 6, id })).status, 202);
  const status = await fetch(base + "/" + id);
  assert.equal(status.headers.get("cache-control"), "no-store");
  assert.equal((await status.json()).id, id);
  assert.equal((await post({ recipe, index: 1, id })).status, 409);
  assert.equal((await post({}, `/${id}/cancel`)).status, 200);
  assert.equal((await fetch(base + "/missing")).status, 404);
});
