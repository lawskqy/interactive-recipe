const { test } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const { removeMagenta } = require("../color-key");

async function fixture(background = [212, 76, 134]) {
  const pixels = Buffer.alloc(40 * 40 * 4);
  const set = (x, y, rgb, alpha = 255) => pixels.set([...rgb, alpha], (y * 40 + x) * 4);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) set(x, y, background);
  for (let y = 8; y < 32; y++) for (let x = 8; x < 32; x++) set(x, y, [255, 255, 255]);
  for (let y = 14; y < 25; y++) for (let x = 14; x < 25; x++) set(x, y, background);
  set(10, 10, [255, 255, 255], 120);
  set(8, 12, background.map(c => Math.round((c + 100) / 2)));
  const png = await sharp(pixels, { raw: { width: 40, height: 40, channels: 4 } }).png().toBuffer();
  return { png, pixels };
}

test("global key uses measured pink, clears enclosed holes and retains white materials and soft edges", async () => {
  const { png } = await fixture();
  const result = await removeMagenta(png);
  const actual = await sharp(result.png).ensureAlpha().raw().toBuffer();
  const rgba = (x, y) => [...actual.subarray((y * 40 + x) * 4, (y * 40 + x) * 4 + 4)];
  assert.deepEqual(result.info.estimatedBackground, [212, 76, 134]);
  assert.equal(result.info.exactTargetBorder, 0);
  assert.equal(rgba(0, 0)[3], 0);
  assert.equal(rgba(18, 18)[3], 0);
  assert.deepEqual(rgba(10, 10), [255, 255, 255, 120]);
  assert.deepEqual(rgba(11, 11), [255, 255, 255, 255]);
  assert.ok(rgba(8, 12)[3] > 100 && rgba(8, 12)[3] < 165);
  const edge = rgba(8, 12).slice(0, 3);
  assert.ok(Math.max(...edge) - Math.min(...edge) < 25, "Edge should have little background color contamination");
});

test("already transparent artwork keeps its original foreground colors and alpha", async () => {
  const { pixels } = await fixture();
  for (let p = 0; p < 1600; p++) if (pixels[p * 4] === 212) pixels[p * 4 + 3] = 0;
  pixels.set([212, 76, 134, 170], (10 * 40 + 10) * 4);
  const png = await sharp(pixels, { raw: { width: 40, height: 40, channels: 4 } }).png().toBuffer();
  const result = await removeMagenta(png);
  assert.equal(result.info.alreadyTransparent, true);
  assert.deepEqual(await sharp(result.png).raw().toBuffer(), pixels);
});

test("wrong-color, nonuniform and empty sources fail instead of publishing broken artwork", async () => {
  const invalid = error => error.code === "UNSUITABLE_BACKGROUND";
  const { png } = await fixture([255, 255, 255]);
  await assert.rejects(removeMagenta(png), invalid);
  for (const background of ['#ff00ff', '#00000000']) {
    const blank = await sharp({ create: { width: 40, height: 40, channels: 4, background } }).png().toBuffer();
    await assert.rejects(removeMagenta(blank), invalid);
  }
  const { pixels } = await fixture();
  for (let y = 0; y < 40; y++) pixels.set([20, 20, 20, 255], y * 40 * 4);
  const uneven = await sharp(pixels, { raw: { width: 40, height: 40, channels: 4 } }).png().toBuffer();
  await assert.rejects(removeMagenta(uneven), invalid);
});
