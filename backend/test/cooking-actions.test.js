const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ACTION_TYPES } = require("../cooking-actions");
const recipes = require("../../frontend/public/recipes.json");
const expected = require("./fixtures/recipe-actions.json");

test("the reference actions cover every recipe step with the shared vocabulary", () => {
  assert.deepEqual(Object.keys(expected).sort(), recipes.map((recipe) => recipe.id).sort());
  const used = new Set();
  for (const recipe of recipes) {
    assert.equal(expected[recipe.id].length, recipe.steps.length, recipe.id);
    for (const step of expected[recipe.id]) {
      assert.ok(step.length, recipe.id);
      for (const type of step) { assert.ok(ACTION_TYPES.includes(type), `${recipe.id}: ${type}`); used.add(type); }
    }
  }
  assert.deepEqual([...used].sort(), [...ACTION_TYPES].sort());
});

test("the frontend lists the same actions as the planner", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../frontend/src/lib/cooking-actions.ts"), "utf8");
  const list = source.match(/ACTION_TYPES = \[([^\]]+)\]/)[1];
  assert.deepEqual([...list.matchAll(/"([a-z-]+)"/g)].map((match) => match[1]), ACTION_TYPES);
});
