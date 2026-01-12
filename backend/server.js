const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

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


app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
