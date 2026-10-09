const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { setTimeout: delay } = require("node:timers/promises");
const { fail, hash, safeName, imageReference, singleFlight, createQueue } = require("./core");
const { cachedPng, writePng } = require("./resources");

const STYLE = "Watercolor and fine ink cafe illustration, muted sage and walnut palette. One isolated object or preparation centered with generous empty margins on a plain white background for segmentation. No scenery, tabletop, text, labels, hands, border or cast shadow. Preserve transparent glass outlines and the entire container. Show the described physical state, not an action or a future result.";
const segmentationEnabled = () => process.env.COMFY_ENABLED === "true" || Boolean(process.env.COMFY_OUTPUT_DIR);

// Use ComfyUI's upload/view API, so its filesystem need not be shared with Node.
function createSegmenter({ fetchImpl = fetch, sleep = delay, timeout = 180000 } = {}) {
  return async function segment(input, output, label) {
    const signal = AbortSignal.timeout(timeout);
    const base = (process.env.COMFY_URL || "http://127.0.0.1:8188").replace(/\/$/, "");
    const request = async (route, options = {}) => {
      const response = await fetchImpl(base + route, { ...options, signal });
      if (!response.ok) fail("Background removal could not complete this request.", 502);
      return response;
    };
    const form = new FormData();
    form.append("image", new Blob([await fs.promises.readFile(input)], { type: "image/png" }), path.basename(input));
    form.append("type", "input");
    form.append("overwrite", "true");
    const upload = await (await request("/upload/image", { method: "POST", body: form })).json();
    if (typeof upload.name !== "string" || !/^[\w().-]+\.png$/.test(upload.name) ||
        (upload.subfolder && !/^[\w/-]+$/.test(upload.subfolder))) fail("Invalid background-removal upload.", 502);
    const workflow = JSON.parse(await fs.promises.readFile(path.join(__dirname, "segment-anything.json"), "utf8"));
    workflow["2"].inputs.image = [upload.subfolder, upload.name].filter(Boolean).join("/");
    workflow["3"].inputs.prompt = label + ", entire container and contents";
    workflow["14"].inputs.filename_prefix = "quiet-cup/" + path.basename(output, ".png");
    const { prompt_id } = await (await request("/prompt", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow, client_id: "quiet-cup-preparation" }),
    })).json();
    if (typeof prompt_id !== "string" || !prompt_id) fail("Background removal did not accept the job.", 502);
    while (!signal.aborted) {
      const history = await (await request("/history/" + encodeURIComponent(prompt_id))).json();
      const result = history[prompt_id];
      if (result?.status?.status_str === "error") fail("Background removal failed. Please retry.", 502);
      const image = result?.outputs?.["14"]?.images?.[0];
      if (image) {
        if (typeof image.filename !== "string" || !image.filename.endsWith(".png")) fail("Invalid background-removal output.", 502);
        const query = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || "", type: image.type || "output" });
        const response = await request("/view?" + query);
        // Bound streamed output even when ComfyUI omits Content-Length.
        const chunks = [];
        let size = 0;
        for await (const chunk of response.body) {
          size += chunk.length;
          if (size > 12 * 1024 * 1024) fail("The segmented image is too large.", 502);
          chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks);
        if (bytes[25] !== 6 && bytes[25] !== 4) fail("Background removal returned an image without an alpha channel.", 502);
        await writePng(output, bytes);
        return;
      }
      if (result?.status?.completed) fail("Background removal returned no image.", 502);
      await sleep(750, undefined, { signal });
    }
    signal.throwIfAborted();
  };
}

function createArtwork({ generate, images, media, segment = createSegmenter(), enabled = segmentationEnabled }) {
  const single = singleFlight();
  const queue = createQueue(2, 12, 60000);
  const resolve = (src) => imageReference(src, { images, media });
  const identity = () => ({ version: 1, style: STYLE, model: process.env.IMAGE_MODEL || "gemini-2.5-flash-image",
    segmentation: enabled(), workflow: hash(JSON.parse(fs.readFileSync(path.join(__dirname, "segment-anything.json"), "utf8"))) });
  const available = async (asset) => {
    if (asset.warning && enabled()) return false; // Retrying can repair a failed cutout without regenerating the PNG.
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
      ...identity(), prompt, references: referenceData.map(({ id, digest }) => ({ id, digest })),
    });
    return single(key, () => queue(async () => {
      const original = path.join(media, key + ".png");
      const cutout = path.join(media, key + "_seg.png");
      if (enabled() && await cachedPng(cutout)) return { src: `/media/${key}_seg.png`, segmented: true };
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
      if (enabled()) {
        try {
          onProgress(`Removing the background from ${item.name}…`);
          await segment(original, cutout, item.name);
          return { src: `/media/${key}_seg.png`, segmented: true };
        } catch {
          return { src: `/media/${key}.png`, segmented: false,
            warning: "Background removal was unavailable for some artwork. Original illustrations are shown; retry to create the cutouts." };
        }
      }
      return { src: `/media/${key}.png`, segmented: false,
        warning: "Background removal is not configured. New illustrations are shown with their backgrounds." };
    }));
  }
  return { render, available, identity };
}
module.exports = { createArtwork, createSegmenter, segmentationEnabled };
