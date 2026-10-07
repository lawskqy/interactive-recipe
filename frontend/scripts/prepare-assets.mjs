import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");
const recipes = JSON.parse(
  await fs.readFile(path.join(publicDir, "recipes.json"), "utf8"),
);
const canonical = (s) =>
  s
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w_]/g, "")
    .slice(0, 40);
await fs.mkdir(path.join(publicDir, "thumbnails"), { recursive: true });
await fs.mkdir(path.join(publicDir, "assets"), { recursive: true });
for (const recipe of recipes)
  await sharp(path.join(publicDir, "images", recipe.image))
    .resize(480, 480, { fit: "cover" })
    .webp({ quality: 82 })
    .toFile(path.join(publicDir, "thumbnails", recipe.id + ".webp"));
const manifest = {};
const names = (await fs.readdir(path.join(publicDir, "images"))).filter(
  (name) => name.endsWith(".png") && !name.includes("_step_") && !recipes.some((r) => r.image === name),
);
for (const name of names.sort(
  (a, b) => Number(a.endsWith("_seg.png")) - Number(b.endsWith("_seg.png")),
)) {
  const key = canonical(name.replace(/_seg\.png$|\.png$/g, ""));
  const output = path.join(publicDir, "assets", key + ".webp");
  await sharp(path.join(publicDir, "images", name))
    .resize(160, 160, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(output);
  manifest[key] = "/assets/" + key + ".webp";
}
await fs.writeFile(
  path.join(publicDir, "asset-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Prepared",
  recipes.length,
  "covers and",
  Object.keys(manifest).length,
  "ingredient/tool images.",
);
