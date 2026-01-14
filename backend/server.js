const express = require("express");
const cors = require("cors");
const axios = require("axios");
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

const WebSocket = require('ws');

async function generateImage(prompt) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://127.0.0.1:8188');

        ws.on('open', () => {
            ws.send(JSON.stringify({
                node: 'IngredientNode', 
                prompt: prompt
            }));
        });

        ws.on('message', (data) => {
            const buffer = Buffer.from(data);
            resolve(buffer.toString('base64')); 
            ws.close();
        });

        ws.on('error', (err) => reject(err));
    });
}

app.use(cors());
app.use(express.json());

app.post('/generate-image', async (req, res) => {
    try {
        const prompt = req.body.prompt;
        const imageBase64 = await generateImage(prompt);
        res.json({ image: imageBase64 });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating image');
    }
});

app.listen(8080, () => console.log('Server running on http://localhost:8080'));


app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
