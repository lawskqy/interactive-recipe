const { test } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { segmentImage } = require("../opencv-segmentation");

async function fixture(background) {
  const width = 96, height = 96;
  const pixels = Buffer.alloc(width * height * 4);
  const set = (x, y, rgb, alpha = 255) => pixels.set([...rgb, alpha], (y * width + x) * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) set(x, y, background);
  // Outlined glass with pale contents, colored fruit, and a handle opening.
  for (let y = 25; y < 80; y++) for (let x = 20; x < 65; x++) set(x, y, [55, 65, 50]);
  for (let y = 29; y < 76; y++) for (let x = 24; x < 61; x++) set(x, y, [220, 235, 232]);
  for (let y = 55; y < 72; y++) for (let x = 27; x < 58; x++) set(x, y, [185, 55, 75]);
  for (let y = 35; y < 64; y++) for (let x = 65; x < 81; x++) set(x, y, [110, 85, 40]);
  for (let y = 39; y < 60; y++) for (let x = 65; x < 77; x++) set(x, y, background);
  // A disconnected utensil must not be discarded as a small component.
  for (let y = 12; y < 72; y++) for (let x = 8; x < 12; x++) set(x, y, [140, 95, 55]);
  const png = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return { png, pixels, width, height };
}

test("OpenCV removes white, pink and pale colored backdrops while preserving glass, fruit and detached tools", async () => {
  for (const background of [[253, 253, 253], [215, 66, 124], [210, 230, 245]]) {
    const { png, width, height } = await fixture(background);
    const result = await segmentImage(png);
    assert.equal(result.info.width, width);
    assert.equal(result.info.height, height);
    const pixels = await sharp(result.png).raw().toBuffer();
    const rgba = (x, y) => [...pixels.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)];
    assert.equal(rgba(0, 0)[3], 0);
    assert.equal(rgba(70, 45)[3], 0, "Handle opening is transparent");
    assert.deepEqual(rgba(40, 40), [220, 235, 232, 255]);
    assert.deepEqual(rgba(40, 65), [185, 55, 75, 255]);
    assert.deepEqual(rgba(10, 30), [140, 95, 55, 255]);
  }
});

test("existing cutouts retain their colors and soft transparency exactly", async () => {
  const { pixels, width, height } = await fixture([253, 253, 253]);
  for (let p = 0; p < width * height; p++) if (pixels[p * 4] === 253) pixels[p * 4 + 3] = 0;
  pixels.set([200, 70, 140, 120], (40 * width + 40) * 4);
  const input = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const result = await segmentImage(input);
  assert.equal(result.info.alreadyTransparent, true);
  assert.deepEqual(await sharp(result.png).raw().toBuffer(), pixels);
});

test("white ceramic inside an outline stays opaque while the off-center handle hole clears", async () => {
  const { pixels, width, height } = await fixture([253, 253, 253]);
  for (let y = 29; y < 54; y++) for (let x = 24; x < 61; x++) pixels.set([255, 255, 255, 255], (y * width + x) * 4);
  const input = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  const result = await segmentImage(input);
  const actual = await sharp(result.png).raw().toBuffer();
  assert.equal(actual[(40 * width + 40) * 4 + 3], 255);
  assert.equal(actual[(45 * width + 70) * 4 + 3], 0);
});

test("white padding and its blended seam are removed without moving the foreground", async () => {
  const { pixels: source } = await fixture([215, 66, 124]);
  for (let x = 0; x < 96; x++) {
    source.set([220, 155, 178, 255], x * 4);
    source.set([244, 228, 234, 255], (95 * 96 + x) * 4);
  }
  const png = await sharp(source, { raw: { width: 96, height: 96, channels: 4 } }).png().toBuffer();
  const input = await sharp(png).extend({ top: 8, bottom: 8, left: 0, right: 0, background: 'white' }).png().toBuffer();
  const result = await segmentImage(input);
  const pixels = await sharp(result.png).raw().toBuffer();
  assert.equal(result.info.height, 112);
  assert.equal(pixels[(3 * 96 + 40) * 4 + 3], 0);
  assert.equal(pixels[(10 * 96 + 40) * 4 + 3], 0);
  assert.equal(pixels[(8 * 96 + 40) * 4 + 3], 0);
  assert.equal(pixels[(103 * 96 + 40) * 4 + 3], 0);
  assert.equal(pixels[(48 * 96 + 40) * 4 + 3], 255);
});

test("blank and transparent-empty images fail without returning an empty cutout", async () => {
  for (const background of ['white', '#d7427c', '#00000000']) {
    const input = await sharp({ create: { width: 40, height: 40, channels: 4, background } }).png().toBuffer();
    await assert.rejects(segmentImage(input), (error) => error.code === 'UNSUITABLE_BACKGROUND');
  }
});
