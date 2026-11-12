const { parentPort } = require("node:worker_threads");
const { segmentImage } = require("./opencv-segmentation");

parentPort.on("message", async ({ input, single }) => {
  try {
    const { png } = await segmentImage(input, { single });
    parentPort.postMessage({ png });
  } catch (error) {
    parentPort.postMessage({ error: { message: error.message, code: error.code } });
  }
});
