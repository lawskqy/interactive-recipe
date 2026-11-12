const sharp = require('sharp');

// An alpha channel or a _seg filename alone does not prove removal succeeded.
async function isCutout(input) {
  try {
    const { data, info: { width, height } } = await sharp(input, { limitInputPixels: 16777216 })
      .toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0, visible = 0, border = 0, clearBorder = 0;
    for (let p = 0; p < width * height; p++) {
      const alpha = data[p * 4 + 3];
      if (alpha <= 8) transparent++;
      if (alpha > 8) visible++;
      const x = p % width, y = Math.floor(p / width);
      if (!x || !y || x === width - 1 || y === height - 1) {
        border++;
        if (alpha <= 8) clearBorder++;
      }
    }
    return transparent >= width * height * 0.01 && visible >= width * height * 0.001 && clearBorder >= border * 0.9;
  } catch { return false; }
}

module.exports = { isCutout };
