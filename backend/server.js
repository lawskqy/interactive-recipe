const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const agentPath = path.join(__dirname, "my_agent", "agent.py");
const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

app.post("/send-message", (req, res) => {
  const payload = JSON.stringify({ message: req.body });

  const pythonProcess = spawn("python", [agentPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { 
      ...process.env, 
      GOOGLE_API_KEY: "AIzaSyBaW8N7yDFq3_DzkVK-yQcq_P5u1LN5SUk" 
    }
  });

  let output = "";

  pythonProcess.stdout.on("data", (data) => output += data.toString());
  pythonProcess.stderr.on("data", (data) => console.error("Python error:", data.toString()));

  pythonProcess.on("close", () => {
    const safeOutput = output.replace(/AIzaSy\w{32}/g, "").trim();
    res.send({ reply: safeOutput });
  });

  pythonProcess.stdin.write(payload + "\n");
  pythonProcess.stdin.end();
});

const COMFY_URL = "http://127.0.0.1:8188";
const IMAGE_CACHE = path.join(__dirname, "image_cache");
if (!fs.existsSync(IMAGE_CACHE)) fs.mkdirSync(IMAGE_CACHE, { recursive: true });

const workflow = JSON.parse(
  fs.readFileSync(path.join(__dirname, "flux_schnell.json"), "utf8")
);

function injectPrompt(workflow, prompt) {
  const wf = JSON.parse(JSON.stringify(workflow));

  for (const nodeId in wf) {
    const node = wf[nodeId];
    if (
      node.class_type === "PrimitiveStringMultiline" &&
      node._meta?.title === "Prompt"
    ) {
      node.inputs.value = prompt;
    }
  }

  return wf;
}

function makeSafeName(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 50);
}

async function generateImage(prompt) {
  const name = makeSafeName(prompt);
  const cachedPath = path.join(IMAGE_CACHE, `${name}.png`);

  if (fs.existsSync(cachedPath)) {
    console.log("cache hit");
    return fs.readFileSync(cachedPath).toString("base64");
  }

  console.log(" generating image", name);

  const workflowWithPrompt = injectPrompt(workflow, prompt);

  const promptRes = await axios.post(`${COMFY_URL}/prompt`, {
      prompt: workflowWithPrompt
  });

  const promptId = promptRes.data.prompt_id;

  let history;
  while (true) {
      await new Promise(r => setTimeout(r, 1000));
      const h = await axios.get(`${COMFY_URL}/history/${promptId}`);
      if (h.data[promptId]) {
      history = h.data[promptId];
      break;
      }
  }

  const outputs = Object.values(history.outputs);
  const images = outputs.flatMap(o => o.images || []);

  if (!images.length) {
      throw new Error("No images generated");
  }

  const img = images[0];

  const imgRes = await axios.get(`${COMFY_URL}/view`, {
      params: {
      filename: img.filename,
      subfolder: img.subfolder,
      type: img.type
      },
      responseType: "arraybuffer"
  });

  fs.writeFileSync(cachedPath, imgRes.data);

  return Buffer.from(imgRes.data).toString("base64");
}

const IN_FLIGHT = new Map();
let imageQueue = Promise.resolve();

app.post("/generate-image", (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).send("No prompt");

  const key = crypto.createHash("sha256").update(prompt).digest("hex");

  if (IN_FLIGHT.has(key)) {
    return IN_FLIGHT.get(key)
      .then(image => res.json({ image }))
      .catch(() => {
        if (!res.headersSent) res.status(500).send("Generation error");
      });
  }

  const job = async () => {
    try {
      const image = await generateImage(prompt);
      return image;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      IN_FLIGHT.delete(key);
    }
  };

  const promise = imageQueue = imageQueue.then(job, job);
  IN_FLIGHT.set(key, promise);

  promise.then(image => res.json({ image }))
         .catch(() => {
           if (!res.headersSent) res.status(500).send("Generation error");
         });
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));


