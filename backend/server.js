const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const agentPath = path.join(__dirname, "my_agent", "agent.py");
const imageAgentPath = path.join(__dirname, "my_agent", "image_agent.py");
const app = express();
const port = 8080;
const PYTHON = "C:\\Users\\devil\\AppData\\Local\\Programs\\Python\\Python314\\python.exe";


app.use(cors());
app.use(express.json());

app.post("/send-message", (req, res) => {
  const payload = JSON.stringify({ message: req.body });

  const pythonProcess = spawn(PYTHON, [agentPath], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { 
      ...process.env,  
    }
  });

  let output = "";

  pythonProcess.stdout.on("data", (data) => output += data.toString());
  pythonProcess.stderr.on("data", (data) => 
    console.error("Python error:", data.toString())
  );

  pythonProcess.on("close", () => {
    const safeOutput = output.replace(/AIzaSy\w{32}/g, "").trim();
    res.send({ reply: safeOutput });
  });

  pythonProcess.stdin.write(payload + "\n");
  pythonProcess.stdin.end();
});

const WORKFLOW_PATH = path.join(__dirname, "sdxlturbo.json");

const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"));

function runImageAgent(ingredient) {
  return new Promise((resolve, reject) => {
    const python = spawn(PYTHON, [imageAgentPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { 
        ...process.env,  
      }
    });

    let stdout = "";
    let stderr = "";

    python.stdout.on("data", d => stdout += d.toString());
    python.stderr.on("data", d => stderr += d.toString());

    python.on("close", code => {
      if (code !== 0) return reject(stderr);
      resolve(stdout.trim());
    });

    python.stdin.write(JSON.stringify({
      type: "image",
      ingredient,
      workflow
    }));
    python.stdin.end();
  });
}

app.post("/generate-image", async (req, res) => {
  const { ingredient } = req.body;
  if (!ingredient) return res.status(400).send("No ingredient");

  try {
    const raw = await runImageAgent(ingredient);
    const parsed = JSON.parse(raw);

    res.json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).send("Generation error");
  }
});


app.listen(port, () => console.log(`Server running at http://localhost:${port}`));


