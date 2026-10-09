const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createArtwork, createSegmenter } = require("../preparation-artwork");
const { writePng } = require("../resources");
const images = path.resolve(__dirname, "../../frontend/public/images");
const png = fs.readFileSync(path.join(images, "matcha_powder_seg.png"));
function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "quiet-cup-preparation-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith("quiet-cup-preparation-"));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}
const request = () => ({ item: { id: "s7o1", name: "layered drink", appearance: "Green matcha floating over a purple blueberry base" },
  kind: "result", recipe: { name: "blueberry matcha fizz" }, step: { instruction: "Pour the prepared matcha on top.", actions: ["pour"] },
  references: [{ id: "s1o1", name: "prepared matcha", src: "/media/prepared.png", sourceStep: 0 },
    { id: "s6o1", name: "blueberry base", src: "/media/base.png", sourceStep: 5 }] });

test("result generation attaches both named preparation images and caches by reference content", async (t) => {
  const media = temporary(t);
  fs.writeFileSync(path.join(media, "prepared.png"), png);
  fs.writeFileSync(path.join(media, "base.png"), png);
  const calls = [];
  const artwork = createArtwork({ images, media, enabled: () => false, generate: async (options) => {
    calls.push(options);
    return { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png.toString("base64") } }] } }] };
  } });
  const first = await artwork.render(request());
  assert.equal(first.segmented, false);
  assert.match(first.warning, /not configured/);
  const parts = calls[0].contents[0].parts;
  assert.equal(parts.filter((part) => part.inlineData).length, 2);
  assert.match(parts[1].text, /prepared matcha, prepared in step 1/);
  assert.match(parts[3].text, /blueberry base, prepared in step 6/);
  assert.equal(parts[2].inlineData.data, png.toString("base64"));
  assert.equal((await artwork.render(request())).src, first.src);
  assert.equal(calls.length, 1);
  fs.writeFileSync(path.join(media, "prepared.png"), fs.readFileSync(path.join(images, "water_seg.png")));
  assert.notEqual((await artwork.render(request())).src, first.src);
  assert.equal(calls.length, 2);
});

test("segmentation failure is explicit and retry reuses the generated original", async (t) => {
  const media = temporary(t);
  let generated = 0;
  let segments = 0;
  const artwork = createArtwork({ images, media, enabled: () => true, generate: async () => {
    generated++;
    return { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png.toString("base64") } }] } }] };
  }, segment: async (_, output) => {
    if (++segments === 1) throw new Error("Comfy offline");
    await writePng(output, png);
  } });
  const options = { ...request(), references: [] };
  const fallback = await artwork.render(options);
  assert.equal(fallback.segmented, false);
  assert.match(fallback.warning, /retry/);
  assert.equal(await artwork.available(fallback), false);
  const repaired = await artwork.render(options);
  assert.equal(repaired.segmented, true);
  assert.match(repaired.src, /_seg.png$/);
  assert.equal(generated, 1);
  assert.equal((await artwork.render(options)).src, repaired.src);
  assert.equal(segments, 2);
});

test("stock cutouts are reused for raw objects but never substituted for a step output", async (t) => {
  const media = temporary(t);
  const artwork = createArtwork({ images, media, generate: async () => { throw new Error("generation reached"); }, enabled: () => false });
  const item = { id: "i1", name: "matcha powder", appearance: "Green powder" };
  assert.deepEqual(await artwork.render({ item, kind: "object", references: [] }), { src: "/images/matcha_powder_seg.png", segmented: true });
  await assert.rejects(artwork.render({ ...request(), item, references: [] }), /generation reached/);
});

test("ComfyUI transport uploads the input, uses its returned filename and downloads RGBA output", async (t) => {
  const media = temporary(t);
  const input = path.join(media, "input.png");
  const output = path.join(media, "step_00000000000000000000_seg.png");
  fs.writeFileSync(input, png);
  const visited = [];
  const segment = createSegmenter({ fetchImpl: async (url, options) => {
    const parsed = new URL(url);
    visited.push(parsed.pathname);
    if (parsed.pathname === "/upload/image") {
      assert.ok(options.body instanceof FormData);
      assert.equal(options.body.get("type"), "input");
      return Response.json({ name: "uploaded.png", subfolder: "" });
    }
    if (parsed.pathname === "/prompt") {
      const body = JSON.parse(options.body);
      assert.equal(body.prompt["2"].inputs.image, "uploaded.png");
      assert.match(body.prompt["3"].inputs.prompt, /prepared matcha/);
      return Response.json({ prompt_id: "test-job" });
    }
    if (parsed.pathname === "/history/test-job") return Response.json({ "test-job": { outputs: { "14": { images: [{ filename: "cutout.png", subfolder: "quiet-cup", type: "output" }] } } } });
    assert.equal(parsed.pathname, "/view");
    assert.equal(parsed.searchParams.get("filename"), "cutout.png");
    return new Response(png);
  } });
  await segment(input, output, "prepared matcha");
  assert.deepEqual(fs.readFileSync(output), png);
  assert.deepEqual(visited, ["/upload/image", "/prompt", "/history/test-job", "/view"]);
});
