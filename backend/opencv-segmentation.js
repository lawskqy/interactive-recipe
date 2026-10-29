const sharp = require("sharp");

const SEGMENTATION_VERSION = "opencv-grabcut-v1";
const invalid = (message) => Object.assign(new Error(message), { code: "UNSUITABLE_BACKGROUND" });
let runtime;
function openCv() {
  runtime ||= Promise.resolve(require("@techstark/opencv-js"));
  return runtime;
}

function backgroundColors(data, width, height) {
  const groups = [];
  const sample = (p) => {
    const rgb = [...data.subarray(p * 3, p * 3 + 3)];
    let group = groups.find((entry) => Math.max(...rgb.map((v, c) => Math.abs(v - entry.sum[c] / entry.count))) < 32);
    if (!group) { group = { sum: [0, 0, 0], count: 0 }; groups.push(group); }
    rgb.forEach((v, c) => { group.sum[c] += v; });
    group.count++;
  };
  for (let x = 0; x < width; x++) { sample(x); sample((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { sample(y * width); sample(y * width + width - 1); }
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  return groups.sort((a, b) => b.count - a.count).filter((group) => group.count >= total * 0.1).slice(0, 3)
    .map((group) => group.sum.map((value) => Math.round(value / group.count)));
}

async function segmentImage(input) {
  const { data: original, info: full } = await sharp(input, { limitInputPixels: 16777216 })
    .toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const count = full.width * full.height;
  let visible = 0, borderVisible = 0;
  for (let p = 0; p < count; p++) if (original[p * 4 + 3] > 0) {
    visible++;
    const x = p % full.width, y = Math.floor(p / full.width);
    if (!x || !y || x === full.width - 1 || y === full.height - 1) borderVisible++;
  }
  if (visible < count * 0.001) throw invalid("The illustration is empty.");
  const encode = () => sharp(original, { raw: { width: full.width, height: full.height, channels: 4 } }).png().toBuffer();
  if (!borderVisible) return { png: await encode(), info: { alreadyTransparent: true } };
  const { data, info: { width, height } } = await sharp(original, { raw: { width: full.width, height: full.height, channels: 4 } })
    .resize(640, 640, { fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (width < 8 || height < 8) throw invalid("The illustration is too small to separate.");
  const colors = backgroundColors(data, width, height);
  if (!colors.length) throw invalid("No background region could be identified.");
  const nearest = (r, g, b) => {
    let distance = Infinity, key;
    const pixel = [r, g, b];
    for (const color of colors) {
      const next = Math.max(Math.abs(r - color[0]), Math.abs(g - color[1]), Math.abs(b - color[2]));
      if (next < distance) { distance = next; key = color; }
    }
    // White padding and a colored backdrop meet in blended anti-aliased seams.
    // Include those mixtures in the background model instead of retaining lines.
    for (let a = 0; a < colors.length; a++) for (let b = a + 1; b < colors.length; b++) {
      const delta = colors[b].map((value, c) => value - colors[a][c]);
      const length = delta.reduce((sum, value) => sum + value * value, 0);
      const weight = Math.max(0, Math.min(1, pixel.reduce((sum, value, c) => sum + (value - colors[a][c]) * delta[c], 0) / length));
      const color = colors[a].map((value, c) => value + weight * delta[c]);
      const next = Math.max(...pixel.map((value, c) => Math.abs(value - color[c])));
      if (next < distance) { distance = next; key = color; }
    }
    return { distance, key };
  };
  const cv = await openCv();
  const mats = [];
  const keep = (mat) => { mats.push(mat); return mat; };
  try {
    const src = keep(cv.matFromArray(height, width, cv.CV_8UC3, data));
    const near = keep(new cv.Mat(height, width, cv.CV_8UC1));
    const strong = keep(new cv.Mat(height, width, cv.CV_8UC1));
    const mask = keep(new cv.Mat(height, width, cv.CV_8UC1));
    for (let p = 0; p < width * height; p++) {
      const { distance, key } = nearest(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]);
      const tolerance = Math.max(...key) - Math.min(...key) > 40 ? 40 : 12;
      near.data[p] = distance <= tolerance ? 255 : 0;
      strong.data[p] = distance > tolerance + 24 ? 255 : 0;
      mask.data[p] = near.data[p] ? cv.GC_PR_BGD : cv.GC_PR_FGD;
    }
    const labels = keep(new cv.Mat());
    cv.connectedComponents(near, labels, 4, cv.CV_32S);
    const exterior = new Set();
    for (let x = 0; x < width; x++) { exterior.add(labels.data32S[x]); exterior.add(labels.data32S[(height - 1) * width + x]); }
    for (let y = 1; y < height - 1; y++) { exterior.add(labels.data32S[y * width]); exterior.add(labels.data32S[y * width + width - 1]); }
    exterior.delete(0);
    const kernel = keep(cv.Mat.ones(3, 3, cv.CV_8UC1));
    cv.erode(strong, strong, kernel);
    let minX = width, maxX = 0, foregroundX = 0, strongCount = 0;
    const enclosed = new Map();
    for (let p = 0; p < width * height; p++) {
      const x = p % width;
      if (strong.data[p]) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); foregroundX += x; strongCount++; }
      const label = labels.data32S[p];
      if (!label || exterior.has(label)) continue;
      let region = enclosed.get(label);
      if (!region) { region = { count: 0, x: 0, neutral: 0 }; enclosed.set(label, region); }
      region.count++; region.x += x;
      const rgb = data.subarray(p * 3, p * 3 + 3);
      if (Math.min(...rgb) >= 220 && Math.max(...rgb) - Math.min(...rgb) < 16) region.neutral++;
    }
    // A white ceramic body can be identical to a white background. Preserve
    // substantial enclosed neutral regions in the object's body; off-center
    // handle openings remain background candidates for GrabCut.
    const material = new Set([...enclosed].filter(([, region]) =>
      region.count >= Math.max(16, width * height * 0.002) && region.neutral / region.count > 0.95 &&
      Math.abs(region.x / region.count - foregroundX / strongCount) < (maxX - minX) * 0.2,
    ).map(([label]) => label));
    let foreground = 0, background = 0;
    for (let p = 0; p < width * height; p++) {
      if (exterior.has(labels.data32S[p])) { mask.data[p] = cv.GC_BGD; background++; }
      else if (strong.data[p] || material.has(labels.data32S[p])) { mask.data[p] = cv.GC_FGD; foreground++; }
    }
    if (foreground < 5 || background < 5) throw invalid("No distinct foreground and background could be identified.");
    const bg = keep(new cv.Mat()), fg = keep(new cv.Mat());
    cv.grabCut(src, mask, new cv.Rect(), bg, fg, 3, cv.GC_INIT_WITH_MASK);
    const matte = keep(new cv.Mat(height, width, cv.CV_8UC1));
    for (let p = 0; p < width * height; p++) matte.data[p] = mask.data[p] === cv.GC_FGD || mask.data[p] === cv.GC_PR_FGD ? 255 : 0;
    const alpha = await sharp(Buffer.from(matte.data), { raw: { width, height, channels: 1 } })
      .resize(full.width, full.height, { kernel: "linear" }).greyscale().raw().toBuffer();
    visible = 0;
    for (let p = 0; p < count; p++) {
      const o = p * 4, opacity = alpha[p] / 255;
      if (opacity > 0 && opacity < 1) {
        const { key } = nearest(original[o], original[o + 1], original[o + 2]);
        for (let c = 0; c < 3; c++) original[o + c] = Math.max(0, Math.min(255, Math.round((original[o + c] - (1 - opacity) * key[c]) / opacity)));
      }
      original[o + 3] = Math.round(original[o + 3] * opacity);
      if (original[o + 3] > 8) visible++;
    }
    if (visible < count * 0.001) throw invalid("Background removal left no visible object.");
    return { png: await encode(), info: { width: full.width, height: full.height, backgroundColors: colors, visibleFraction: visible / count } };
  } finally { mats.reverse().forEach((mat) => mat.delete()); }
}

module.exports = { segmentImage, SEGMENTATION_VERSION };
