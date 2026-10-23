const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { isCutout } = require('../cutout-validation');
const { createArtwork } = require('../preparation-artwork');
const { createApp } = require('../server');

async function fixture(background = 'white') {
  return sharp({ create: { width: 96, height: 96, channels: 4, background } })
    .composite([{ input: Buffer.from('<svg width="60" height="60"><rect x="5" y="5" width="42" height="50" fill="white" stroke="#50402f" stroke-width="5"/><circle cx="46" cy="27" r="11" fill="none" stroke="#50402f" stroke-width="4"/></svg>'), left: 18, top: 18 }]).png().toBuffer();
}
function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quiet-cup-validation-'));
  t.after(() => { assert.equal(path.dirname(dir), os.tmpdir()); fs.rmSync(dir, { recursive: true, force: true }); });
  return dir;
}

test('pixel validation rejects opaque alpha, empty cutouts and a single transparent pixel', async () => {
  const opaque = await fixture();
  assert.equal(await isCutout(opaque), false);
  assert.equal(await isCutout(await fixture('#00000000')), true);
  const empty = await sharp({ create: { width: 96, height: 96, channels: 4, background: '#00000000' } }).png().toBuffer();
  assert.equal(await isCutout(empty), false);
  const pixels = await sharp(opaque).raw().toBuffer();
  pixels[3] = 0;
  assert.equal(await isCutout(await sharp(pixels, { raw: { width: 96, height: 96, channels: 4 } }).png().toBuffer()), false);
});

test('opaque files labelled segmented are repaired locally, validated and reused', async (t) => {
  const images = temp(t), media = temp(t);
  const original = await fixture();
  fs.writeFileSync(path.join(images, 'cup_seg.png'), original);
  let calls = 0;
  const artwork = createArtwork({ images, media, generate: async () => { calls++; throw new Error('No AI needed'); } });
  assert.equal(await artwork.available({ src: '/images/cup_seg.png', segmented: true }), false);
  const result = await artwork.render({ item: { name: 'cup' }, kind: 'object', references: [] });
  assert.notEqual(result.src, '/images/cup_seg.png');
  assert.equal(await artwork.available(result), true);
  assert.equal((await artwork.ensureSegmented('/images/cup_seg.png')).src, result.src);
  const pixels = await sharp(path.join(media, path.basename(result.src))).ensureAlpha().raw().toBuffer();
  assert.equal(pixels[(45 * 96 + 40) * 4 + 3], 255, 'Outlined white ceramic remains opaque');
  assert.deepEqual(fs.readFileSync(path.join(images, 'cup_seg.png')), original);
  assert.equal(calls, 0);
});

test('an opaque segmentation output never becomes ready', async (t) => {
  const images = temp(t), media = temp(t);
  fs.writeFileSync(path.join(images, 'cup.png'), await fixture());
  const artwork = createArtwork({ images, media, generate: async () => {}, segment: async (input, output) => fs.copyFileSync(input, output) });
  await assert.rejects(artwork.ensureSegmented('/images/cup.png'), /Background removal is incomplete/);
});

test('repair endpoint handles old pink results without generation and rejects nonlocal sources', async (t) => {
  const images = temp(t), media = temp(t);
  fs.writeFileSync(path.join(media, 'step_old_seg.png'), await fixture('#d7427c'));
  const artwork = createArtwork({ images, media, generate: async () => { throw new Error('No AI needed'); } });
  const server = createApp({ artwork }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/artwork/segment`;
  const post = (src) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({src}) });
  const response = await post('/media/step_old_seg.png');
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.src, /^\/media\/step_.*_seg.png$/);
  assert.equal(await artwork.available(result), true);
  for (const src of ['https://example.com/image.png', '/images/../secret.png', '/assets/../../.env', null])
    assert.equal((await post(src)).status, 400);
});
