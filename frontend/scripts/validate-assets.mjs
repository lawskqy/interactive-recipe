import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { validateRecipe } = require("../../backend/core.js");
const root = path.resolve(import.meta.dirname, "../public");
const recipes = JSON.parse(fs.readFileSync(path.join(root, "recipes.json"), "utf8"));
const ids = new Set();
for (const recipe of recipes) {
  validateRecipe(recipe);
  if (ids.has(recipe.id)) throw new Error("Duplicate recipe: " + recipe.id);
  ids.add(recipe.id);
  for (const file of ["images/" + recipe.image, "thumbnails/" + recipe.id + ".webp"])
    if (!fs.existsSync(path.join(root, file))) throw new Error("Missing recipe artwork: " + file);
  if (recipe.artworkPending) throw new Error("Outdated artwork flag: " + recipe.id);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, "asset-manifest.json"), "utf8"));
if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error("Invalid asset manifest");
for (const [key, file] of Object.entries(manifest)) {
  if (!/^[\w-]+$/.test(key) || typeof file !== "string" || !/^\/assets\/[\w-]+\.webp$/.test(file) || !fs.existsSync(path.join(root, file))) throw new Error("Invalid asset entry: " + key);
}
console.log(`Validated ${recipes.length} recipes and ${Object.keys(manifest).length} display assets.`);
