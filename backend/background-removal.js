const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { createQueue } = require("./core");
const { writePng } = require("./resources");
const queue = createQueue(1, 12, 60000);
let worker;

function processImage(input) {
  if (!worker) {
    worker = new Worker(path.join(__dirname, "background-removal-worker.js"));
    worker.unref();
  }
  const current = worker;
  current.ref();
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      current.off("message", message);
      current.off("error", error);
      current.off("exit", exit);
      current.unref();
    };
    const error = (reason) => {
      cleanup();
      if (worker === current) worker = undefined;
      void current.terminate();
      reject(reason);
    };
    const exit = () => error(new Error("Background-removal worker stopped."));
    const message = (result) => {
      cleanup();
      if (result.error) reject(Object.assign(new Error(result.error.message), { code: result.error.code }));
      else resolve(Buffer.from(result.png));
    };
    const timeout = setTimeout(() => error(new Error("Background removal timed out.")), 30000);
    current.once("message", message);
    current.once("error", error);
    current.once("exit", exit);
    try { current.postMessage({ input }); } catch (reason) { error(reason); }
  });
}

async function removeBackground(input, output) {
  // Pixel processing stays off Express's event loop; writes retain the cache's
  // PNG validation, size limit, expiry policy and atomic rename.
  return queue(async () => writePng(output, await processImage(input)));
}

module.exports = { removeBackground };
