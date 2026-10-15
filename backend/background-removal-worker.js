const { parentPort } = require("node:worker_threads");
const { removeMagenta } = require("./color-key");

parentPort.on("message", async ({ input }) => {
  try {
    const { png } = await removeMagenta(input);
    parentPort.postMessage({ png });
  } catch (error) {
    parentPort.postMessage({ error: { message: error.message, code: error.code } });
  }
});
