const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const sharp = require("sharp");
const { createArtwork } = require("../preparation-artwork");
const { writePng } = require("../resources");
const { hash } = require("../core");
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
  const artwork = createArtwork({ images, media,
    segment: async (_, output) => writePng(output, png), generate: async (options) => {
    calls.push(options);
    return { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png.toString("base64") } }] } }] };
  } });
  const first = await artwork.render(request());
  assert.equal(first.segmented, true);
  assert.match(first.src, /_seg.png$/);
  const parts = calls[0].contents[0].parts;
  assert.match(parts[0].text, /#FF00FF/);
  assert.match(parts[0].text, /including openings through handles and gaps between wires/);
  assert.match(artwork.identity().backgroundRemoval, /magenta-global-v/);
  assert.equal(artwork.identity().workflow, undefined);
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

test("default background worker produces and caches transparent artwork without an external service", async (t) => {
  const media = temporary(t);
  const input = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#d44c86' } })
    .composite([{ input: await sharp({ create: { width: 30, height: 30, channels: 4, background: 'white' } }).png().toBuffer(), left: 17, top: 17 }]).png().toBuffer();
  let calls = 0;
  const artwork = createArtwork({ images, media, generate: async () => {
    calls++;
    return { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: input.toString("base64") } }] } }] };
  } });
  const options = { ...request(), references: [] };
  const result = await artwork.render(options);
  const file = path.join(media, path.basename(result.src));
  const pixels = await sharp(file).ensureAlpha().raw().toBuffer();
  assert.equal(result.segmented, true);
  assert.equal(pixels[3], 0);
  assert.equal(pixels[(32 * 64 + 32) * 4 + 3], 255);
  assert.equal((await artwork.render(options)).src, result.src);
  assert.equal(calls, 1);
});

test("unsuitable backgrounds are retained for diagnosis and explicit retry generates a fresh usable image", async (t) => {
  const media = temporary(t);
  const wrong = await sharp({ create: { width: 64, height: 64, channels: 4, background: 'white' } }).png().toBuffer();
  let calls = 0;
  const artwork = createArtwork({ images, media, generate: async () => ({ candidates: [{ content: { parts: [{ inlineData: {
    mimeType: "image/png", data: (++calls === 1 ? wrong : png).toString("base64"),
  } }] } }] }) });
  const options = { ...request(), references: [] };
  await assert.rejects(artwork.render(options), /Try again to draw a new illustration/);
  assert.equal(calls, 1, "No automatic paid regeneration");
  const rejected = fs.readdirSync(media);
  assert.equal(rejected.length, 1);
  assert.match(rejected[0], /^step_[a-f0-9]{20}\.png$/, 'Rejected image remains subject to cache expiry and size limits');
  assert.deepEqual(fs.readFileSync(path.join(media, rejected[0])), wrong);
  assert.equal((await artwork.render(options)).segmented, true);
  assert.equal(calls, 2);
});

test("legacy originals are resegmented under a new URL without paid regeneration or overwriting old URLs", async (t) => {
  const media = temporary(t);
  const input = await sharp({ create: { width: 64, height: 64, channels: 4, background: '#d7427c' } })
    .composite([{ input: await sharp({ create: { width: 30, height: 30, channels: 4, background: 'white' } }).png().toBuffer(), left: 17, top: 17 }]).png().toBuffer();
  let prompt;
  const artwork = createArtwork({ images, media, generate: async (options) => {
    prompt = options.contents[0].parts[0].text;
    return { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: input.toString('base64') } }] } }] };
  } });
  const options = { ...request(), references: [] };
  const first = await artwork.render(options);
  const legacyKey = 'step_' + hash({ ...artwork.identity(), backgroundRemoval: 'magenta-global-v1', prompt, references: [] });
  const original = path.join(media, legacyKey + '.png');
  assert.deepEqual(fs.readFileSync(original), input, 'Source identity remains compatible with the old cache');
  const staleCutout = path.join(media, legacyKey + '_seg.png');
  await writePng(staleCutout, input);
  fs.unlinkSync(path.join(media, path.basename(first.src)));
  const restarted = createArtwork({ images, media, generate: async () => { throw new Error('Must reuse the saved drawing'); } });
  const repaired = await restarted.render(options);
  assert.notEqual(repaired.src, '/media/' + path.basename(staleCutout));
  assert.deepEqual(fs.readFileSync(staleCutout), input, 'Previously published immutable URLs are not overwritten');
  assert.deepEqual(fs.readFileSync(original), input);
  const pixels = await sharp(path.join(media, path.basename(repaired.src))).raw().toBuffer();
  assert.equal(pixels[3], 0);
  assert.equal(pixels[(32 * 64 + 32) * 4 + 3], 255);
  assert.equal((await restarted.render(options)).src, repaired.src);
});

test("segmentation failure is explicit and retry reuses the generated original", async (t) => {
  const media = temporary(t);
  let generated = 0;
  let segments = 0;
  const artwork = createArtwork({ images, media, generate: async () => {
    generated++;
    return { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png.toString("base64") } }] } }] };
  }, segment: async (_, output) => {
    if (++segments === 1) throw new Error("Temporary worker failure");
    await writePng(output, png);
  } });
  const options = { ...request(), references: [] };
  await assert.rejects(artwork.render(options), /Background removal could not complete/);
  assert.equal(await artwork.available({ src: "/media/original.png", segmented: false }), false);
  const repaired = await artwork.render(options);
  assert.equal(repaired.segmented, true);
  assert.match(repaired.src, /_seg.png$/);
  assert.equal(generated, 1);
  assert.equal((await artwork.render(options)).src, repaired.src);
  assert.equal(segments, 2);
});

test("stock cutouts are reused for raw objects but never substituted for a step output", async (t) => {
  const media = temporary(t);
  const artwork = createArtwork({ images, media, generate: async () => { throw new Error("generation reached"); } });
  const item = { id: "i1", name: "matcha powder", appearance: "Green powder" };
  assert.deepEqual(await artwork.render({ item, kind: "object", references: [] }), { src: "/images/matcha_powder_seg.png", segmented: true });
  await assert.rejects(artwork.render({ ...request(), item, references: [] }), /generation reached/);
});
