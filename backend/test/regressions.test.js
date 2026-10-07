const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { createApp } = require("../server");
const { validPng, writePng, cachedPng, consumeBudget } = require("../resources");
const recipe = require("../../frontend/public/recipes.json")[0];

test("Host and framing policy; malformed JSON diagnostics; ask versus edit boundary", async (t) => {
  const server = createApp({ generate: async () => ({ text: JSON.stringify({ reply: "Suggestion", recipe: { ...recipe, name: "Changed" } }) }) }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;
  const untrusted = await new Promise((resolve, reject) => {
    http.get(base + "/api/health", { headers: { Host: "untrusted.example" } }, (res) => { res.resume(); resolve(res.statusCode); }).on("error", reject);
  });
  assert.equal(untrusted, 403);
  const health = await fetch(base + "/api/health");
  assert.equal(health.headers.get("x-frame-options"), "DENY");
  assert.match(health.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  const post = (body) => fetch(base + "/api/send-message", { method: "POST", headers: { "Content-Type": "application/json" }, body });
  const malformed = await post("{oops");
  assert.equal(malformed.status, 400);
  assert.match((await malformed.json()).error, /invalid JSON/);
  for (const body of ["null", "[]", '"text"']) assert.equal((await post(body)).status, 400);
  const ask = await post(JSON.stringify({ message: "What is a whisk?", context: recipe, mode: "ask" }));
  assert.equal((await ask.json()).recipe, null);
  const edit = await post(JSON.stringify({ message: "Rename it", context: recipe, mode: "edit" }));
  assert.equal((await edit.json()).recipe.name, "Changed");
  const chat = await post(JSON.stringify({ message: "Can you rename it?", context: recipe, mode: "chat" }));
  assert.equal((await chat.json()).recipe.name, "Changed");
  const invalidPending = await post(JSON.stringify({ message: "Less sugar", context: recipe, mode: "chat", pendingRecipe: { ...recipe, id: "another-recipe" } }));
  assert.equal(invalidPending.status, 400);
});
test("cache rejects truncated images and writes atomically; request allowance persists", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quiet-cup-cache-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const png = fs.readFileSync(path.join(__dirname, "../../frontend/public/images", recipe.image));
  assert.ok(validPng(png));
  assert.equal(validPng(png.subarray(0, png.length - 10)), false);
  const file = path.join(dir, "step_00000000000000000000.png");
  await assert.rejects(writePng(file, Buffer.from("not png")));
  assert.equal(fs.existsSync(file), false);
  await writePng(file, png);
  assert.ok(await cachedPng(file));
  assert.equal(fs.readdirSync(dir).some((name) => name.endsWith(".tmp")), false);
  fs.utimesSync(file, new Date(0), new Date(0));
  assert.equal(await cachedPng(file), false);
  consumeBudget(dir, 2);
  consumeBudget(dir, 2);
  assert.throws(() => consumeBudget(dir, 2), /allowance/);
  fs.writeFileSync(path.join(dir, "daily-usage.json"), "broken");
  assert.throws(() => consumeBudget(dir, 2), /counter needs repair/);
});
test("unavailable provider models return actionable errors without leaking SDK details", async (t) => {
  const server = createApp({ generate: async () => {
    const error = new Error("Sensitive provider request details must stay private");
    error.name = "ApiError";
    error.status = 404;
    throw error;
  } }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/send-message`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Explain the first step", context: recipe }),
  });
  assert.equal(response.status, 502);
  const data = await response.json();
  assert.match(data.error, /CHAT_MODEL/);
  assert.doesNotMatch(data.error, /Sensitive/);
  assert.ok(data.requestId);
});
