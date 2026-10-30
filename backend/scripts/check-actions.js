// Compares the planner's step actions with the reference list in
// test/fixtures/recipe-actions.json. Each recipe is one paid planning call.
// Usage: npm run check:actions -- all | <recipe-id> [<recipe-id> ...]
const fs = require("node:fs");
const path = require("node:path");
const { GoogleGenAI } = require("@google/genai");
const { requestPlan } = require("../preparation");
const recipes = require("../../frontend/public/recipes.json");
const expected = require("../test/fixtures/recipe-actions.json");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("Name recipe ids, or `all` to check every recipe (one paid planning call each).");
  process.exit(1);
}
const selected = ids.includes("all") ? recipes : recipes.filter((recipe) => ids.includes(recipe.id));
if (selected.length !== (ids.includes("all") ? recipes.length : ids.length)) {
  console.error("Unknown recipe id.");
  process.exit(1);
}
const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!key) {
  console.error("GEMINI_API_KEY is not set in backend/.env.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 60000 } });

(async () => {
  const report = [];
  let matched = 0, total = 0;
  for (const recipe of selected) {
    let plan;
    try { plan = await requestPlan((options) => ai.models.generateContent(options), recipe); }
    catch (error) {
      console.log(`${recipe.id}: planning failed (${error.message})`);
      report.push({ recipe: recipe.id, error: error.message });
      continue;
    }
    plan.steps.forEach((step, index) => {
      const actual = step.actions.map((action) => action.type);
      const want = expected[recipe.id][index];
      total++;
      if (actual.join() === want.join()) { matched++; return; }
      console.log(`${recipe.id} step ${index + 1}: expected ${want.join(" → ")}, got ${actual.join(" → ")}\n  ${recipe.steps[index]}`);
      report.push({ recipe: recipe.id, step: index + 1, instruction: recipe.steps[index], expected: want, actions: step.actions });
    });
  }
  console.log(`\n${matched} of ${total} steps match the reference actions.`);
  const output = path.join(__dirname, "../../output/action-check.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(`Differences saved to ${path.relative(process.cwd(), output)}`);
})();
