const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { fail, createQueue } = require("./core");
const MAX_IMAGE = 12 * 1024 * 1024;
const MAX_CACHE = Number(process.env.ILLUSTRATION_CACHE_MB || 2048) * 1024 * 1024;
const writes = createQueue(1);
const managed = /^(step|ingredient)_[a-f0-9]{20}(_seg)?\.png$/;
function validPng(bytes) {
  if (bytes.length < 45 || bytes.length > MAX_IMAGE || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return false;
  let offset = 8, header = false, pixels = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (offset + length + 12 > bytes.length) return false;
    if (!header) {
      if (type !== "IHDR" || length !== 13) return false;
      const width = bytes.readUInt32BE(offset + 8), height = bytes.readUInt32BE(offset + 12);
      if (!width || !height || width > 8192 || height > 8192) return false;
      header = true;
    }
    if (type === "IDAT") pixels = true;
    offset += length + 12;
    if (type === "IEND") return length === 0 && pixels && offset === bytes.length;
  }
  return false;
}
// Saved illustrations never expire by age; each reuse marks them recently used
// so eviction under the size cap removes the least recently used first.
async function cachedPng(file) {
  try {
    const stat = await fs.promises.stat(file);
    if (stat.size > MAX_IMAGE || !validPng(await fs.promises.readFile(file))) return false;
    if (managed.test(path.basename(file))) { const now = new Date(); await fs.promises.utimes(file, now, now).catch(() => {}); }
    return true;
  } catch { return false; }
}
async function writePng(file, bytes, limit = MAX_CACHE) {
  if (!validPng(bytes)) fail("The illustration was incomplete or too large. Please retry.", 502);
  return writes(async () => {
    const root = path.resolve(path.dirname(file));
    await fs.promises.mkdir(root, { recursive: true });
    let size = 0;
    const entries = [];
    for (const name of await fs.promises.readdir(root)) {
      // Only this cache's generated files can be evicted, never source artwork.
      if (!managed.test(name)) continue;
      const target = path.resolve(root, name);
      if (path.dirname(target) !== root || target === path.resolve(file)) continue;
      const stat = await fs.promises.lstat(target);
      if (!stat.isFile()) continue;
      size += stat.size;
      entries.push({ target, size: stat.size, used: stat.mtimeMs });
    }
    entries.sort((a, b) => a.used - b.used);
    while (size + bytes.length > limit && entries.length) {
      const oldest = entries.shift();
      await fs.promises.rm(oldest.target, { force: true });
      size -= oldest.size;
    }
    if (size + bytes.length > limit) fail("Illustration storage is full. Please retry.", 507);
    const temporary = file + "." + crypto.randomUUID() + ".tmp";
    try {
      await fs.promises.writeFile(temporary, bytes, { flag: "wx" });
      await fs.promises.rename(temporary, file);
    } finally { await fs.promises.rm(temporary, { force: true }); }
  });
}
function consumeBudget(directory, limit = 100) {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "daily-usage.json");
  const day = new Date().toISOString().slice(0, 10);
  let usage = { day, count: 0 };
  if (fs.existsSync(file)) {
    try {
      const saved = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!Number.isInteger(saved.count) || saved.count < 0 || typeof saved.day !== "string") throw new Error();
      if (saved.day === day) usage = saved;
    } catch { fail("The local AI usage counter needs repair before more requests can run.", 503); }
  }
  if (usage.count >= limit) fail("Today's local AI request allowance has been reached. Try tomorrow.", 429);
  usage.count++;
  fs.writeFileSync(file + ".tmp", JSON.stringify(usage));
  fs.renameSync(file + ".tmp", file);
}
module.exports = { cachedPng, writePng, validPng, consumeBudget };
