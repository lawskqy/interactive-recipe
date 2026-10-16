const sharp = require("sharp");

// Include this version in artwork cache keys when changing mask or edge behavior.
const COLOR_KEY_VERSION = "magenta-global-v3";
const BACKGROUND_TOLERANCE = 32;
const invalidBackground = (message) => Object.assign(new Error(message), { code: "UNSUITABLE_BACKGROUND" });
const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function removeMagenta(input) {
  const { data, info: { width, height } } = await sharp(input, { limitInputPixels: 16777216 })
    .toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const count = width * height;
  const border = [], channels = [[], [], []];
  let transparentBorder = 0, existingVisible = 0;
  for (let p = 0; p < count; p++) if (data[p * 4 + 3] > 0) existingVisible++;
  if (existingVisible < count * 0.001) throw invalidBackground("The illustration is empty.");
  const sample = (p) => {
    border.push(p);
    if (data[p * 4 + 3] === 0) transparentBorder++;
    for (let c = 0; c < 3; c++) channels[c].push(data[p * 4 + c]);
  };
  for (let x = 0; x < width; x++) {
    sample(x);
    if (height > 1) sample((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    sample(y * width);
    if (width > 1) sample(y * width + width - 1);
  }
  const encode = () => sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
  // Preserve genuine existing transparency, including foreground colors and alpha.
  if (transparentBorder === border.length) return { png: await encode(), info: { width, height, alreadyTransparent: true } };

  const key = channels.map(median);
  const distance = (p) => {
    const o = p * 4;
    return Math.max(Math.abs(data[o] - key[0]), Math.abs(data[o + 1] - key[1]), Math.abs(data[o + 2] - key[2]));
  };
  const uniformBorder = border.filter((p) => distance(p) <= BACKGROUND_TOLERANCE).length / border.length;
  const exactTargetBorder = border.filter((p) => data[p * 4] === 255 && data[p * 4 + 1] === 0 && data[p * 4 + 2] === 255).length / border.length;
  // Gemini often returns a pink shade rather than exact #FF00FF. Measure it.
  if (uniformBorder < 0.95 || key[0] - key[1] < 40 || key[2] - key[1] < 20)
    throw invalidBackground(`The illustration needs a uniform pink or magenta background (border RGB ${key.join(",")}; uniform ${(uniformBorder * 100).toFixed(1)}%).`);
  const keyChroma = Math.min(key[0], key[2]) - key[1];
  let removed = 0, partial = 0, visible = 0;
  for (let p = 0; p < count; p++) {
    const o = p * 4;
    const chroma = Math.min(data[o], data[o + 2]) - data[o + 1];
    // Generated backdrops have local lighting/texture variations even when the
    // border is uniform. Clear that color neighborhood, then feather into the
    // chroma matte instead of leaving those variations as translucent patches.
    const transition = Math.max(0, Math.min(1, (distance(p) - BACKGROUND_TOLERANCE) / 16));
    // Pale pink keys can be close to neutral foreground colors. Never apply
    // color-distance cleanup to pixels without the reserved pink chroma.
    const feather = chroma <= 8 ? 1 : transition * transition * (3 - 2 * transition);
    const alpha = feather * (1 - Math.max(0, Math.min(1, (chroma - 8) / (keyChroma - 8))));
    if (alpha < 0.01) removed++;
    else if (alpha < 0.99) partial++;
    // Unmix the background from soft edges to avoid a pink fringe.
    if (alpha > 0.01 && alpha < 1) for (let c = 0; c < 3; c++)
      data[o + c] = Math.max(0, Math.min(255, Math.round((data[o + c] - (1 - alpha) * key[c]) / alpha)));
    data[o + 3] = Math.round(data[o + 3] * alpha);
    if (data[o + 3] > 8) visible++;
  }
  if (visible < count * 0.001) throw invalidBackground("Background removal left no visible object.");
  return { png: await encode(), info: { width, height, estimatedBackground: key, exactTargetBorder,
    uniformBorder, removedFraction: removed / count, partialFraction: partial / count } };
}

module.exports = { removeMagenta, COLOR_KEY_VERSION };
