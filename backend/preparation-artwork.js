const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { removeBackground } = require("./background-removal");
const { SEGMENTATION_VERSION } = require("./opencv-segmentation");
const { fail, hash, safeName, imageReference, singleFlight, createQueue } = require("./core");
const { cachedPng, writePng } = require("./resources");

const STYLE = "Watercolor and fine ink cafe illustration, muted sage and walnut object palette. One isolated object or preparation centered with generous empty margins; the entire object must fit inside the image. Use a completely uniform flat saturated magenta background, target RGB (255,0,255), hex #FF00FF. Reserve this background color exclusively for the background, including openings through handles and gaps between wires. Render white materials naturally. Use neutral lighting with no magenta reflections or background color cast on the object. Use this background even when reference images have white or transparent backgrounds. No scenery, tabletop, text, labels, hands, border, cast shadow, background texture or gradient. Preserve glass outlines, the entire container and the described contents. Show the described physical state, not an action or a future result.";

function createArtwork({ generate, images, media, segment = removeBackground }) {
  const single = singleFlight();
  const queue = createQueue(2, 12, 60000);
  const resolve = (src) => imageReference(src, { images, media });
  // Retain the original generation identity so existing source drawings remain
  // reusable. Only the cutout's identity changes when the removal algorithm does.
  const sourceIdentity = () => ({ version: 2, style: STYLE, model: process.env.IMAGE_MODEL || "gemini-2.5-flash-image",
    backgroundRemoval: "magenta-global-v1" });
  const identity = () => ({ ...sourceIdentity(), backgroundRemoval: SEGMENTATION_VERSION });
  const available = async (asset) => {
    if (!asset.segmented) return false;
    try { return asset.src.startsWith("/media/") ? await cachedPng(resolve(asset.src)) : fs.existsSync(resolve(asset.src)); }
    catch { return false; }
  };
  async function render({ item, kind, recipe, step, references, onProgress = () => {} }) {
    // Only raw ingredients/tools may use the bundled object library. A preparation
    // must use its own actual earlier result, never a similarly named stock image.
    if (kind === "object") {
      const stem = safeName(item.name);
      const file = fs.readdirSync(images).find((name) => name.endsWith("_seg.png") && safeName(name.slice(0, -8)) === stem);
      if (file) return { src: "/images/" + file, segmented: true };
      const source = fs.readdirSync(images).find((name) => name.endsWith(".png") && safeName(name.slice(0, -4)) === stem);
      if (source) {
        const original = path.join(images, source);
        const digest = crypto.createHash("sha256").update(await fs.promises.readFile(original)).digest("hex");
        const key = "ingredient_" + hash({ stock: source, digest, backgroundRemoval: SEGMENTATION_VERSION });
        return single(key, () => queue(async () => {
          const cutout = path.join(media, key + "_seg.png");
          if (!(await cachedPng(cutout))) {
            onProgress(`Removing the background from ${item.name}…`);
            try { await segment(original, cutout, item.name); }
            catch { fail("The saved ingredient or tool image could not be separated from its background. Please retry.", 502); }
          }
          if (!(await cachedPng(cutout))) fail("Background removal could not complete. Please retry.", 502);
          return { src: `/media/${key}_seg.png`, segmented: true };
        }));
      }
    }
    const referenceData = [];
    for (const reference of references) {
      const file = resolve(reference.src);
      const bytes = await fs.promises.readFile(file);
      referenceData.push({ ...reference, bytes, digest: crypto.createHash("sha256").update(bytes).digest("hex") });
    }
    const prompt = JSON.stringify({
      subject: { name: item.name, appearance: item.appearance },
      ...(kind === "result" ? { recipe: recipe.name, current_step: step.instruction, actions: step.actions,
        inputs: references.map(({ id, name, sourceStep }) => ({ id, name, sourceStep })) } : {}),
    }) + (kind === "result"
      ? "\nRender only this named OUTPUT after the current step. Attached images are the actual named inputs and tools, not examples of the final drink. Preserve their container shapes, colors and material appearance unless this instruction changes them. Combine only the specified preparations. Do not add ingredients or decorations from later steps."
      : "\nIllustrate exactly this individual ingredient or tool in its stated raw state.") + "\nStyle: " + STYLE;
    const key = (kind === "result" ? "step_" : "ingredient_") + hash({
      ...sourceIdentity(), prompt, references: referenceData.map(({ id, digest }) => ({ id, digest })),
    });
    const cutoutKey = (kind === "result" ? "step_" : "ingredient_") + hash({ source: key, backgroundRemoval: SEGMENTATION_VERSION });
    return single(key, () => queue(async () => {
      const original = path.join(media, key + ".png");
      const cutout = path.join(media, cutoutKey + "_seg.png");
      if (await cachedPng(cutout)) return { src: `/media/${cutoutKey}_seg.png`, segmented: true };
      if (!(await cachedPng(original))) {
        onProgress(`Drawing ${item.name}…`);
        const parts = [{ text: prompt }];
        for (const reference of referenceData) {
          parts.push({ text: `Reference ${reference.id}: ${reference.name}${reference.sourceStep !== undefined ? `, prepared in step ${reference.sourceStep + 1}` : ""}.` });
          parts.push({ inlineData: { mimeType: reference.src.endsWith(".webp") ? "image/webp" : "image/png", data: reference.bytes.toString("base64") } });
        }
        const response = await generate({ model: process.env.IMAGE_MODEL || "gemini-2.5-flash-image",
          contents: [{ role: "user", parts }], config: { responseModalities: ["TEXT", "IMAGE"], maxOutputTokens: 8192,
            abortSignal: AbortSignal.timeout(60000) } });
        const image = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.mimeType === "image/png")?.inlineData;
        if (!image?.data || image.data.length > 17 * 1024 * 1024) fail("The assistant returned no usable PNG illustration. Please retry.", 502);
        await writePng(original, Buffer.from(image.data, "base64"));
      }
      try {
        onProgress(`Removing the background from ${item.name}…`);
        await segment(original, cutout, item.name);
        if (!(await cachedPng(cutout))) throw new Error("Missing cutout");
        return { src: `/media/${cutoutKey}_seg.png`, segmented: true };
      } catch (error) {
        if (error.code === "UNSUITABLE_BACKGROUND") {
          // Retrying an unsuitable source cannot improve it. Only an explicit
          // user retry requests a new drawing; there is no automatic paid retry.
          // Keep one rejected source per drawing identity for local diagnosis.
          // Use the managed PNG naming scheme so normal cache size/TTL limits
          // still apply, while the next explicit retry generates a fresh source.
          const rejected = (kind === "result" ? "step_" : "ingredient_") + hash({ rejected: key }) + ".png";
          await fs.promises.rename(original, path.join(media, rejected));
          console.warn(JSON.stringify({ stage: "background-removal", source: rejected, reason: error.message }));
          fail("The illustration could not be separated from its background. Try again to draw a new illustration.", 502);
        }
        fail("Background removal could not complete. Try again; the saved illustration will be reused.", 502);
      }
    }));
  }
  return { render, available, identity };
}
module.exports = { createArtwork };
