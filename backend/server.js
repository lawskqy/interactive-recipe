const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const WebSocket = require("ws");

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



const IMAGE_CACHE = path.join(__dirname, "image_cache");
if (!fs.existsSync(IMAGE_CACHE)) fs.mkdirSync(IMAGE_CACHE, { recursive: true });

const workflowPath = path.join(__dirname, "workflow.json");
const workflow = JSON.parse(fs.readFileSync(workflowPath));

function findNodeByClass(classType) {
    return Object.entries(workflow).find(([id, node]) => node.class_type === classType);
}

async function generateImage(prompt) {
    const safeName = prompt.replace(/\W+/g, "_").slice(0, 50);
    const filePath = path.join(IMAGE_CACHE, safeName + ".png");

    if (fs.existsSync(filePath)) {
        console.log("Using cached image");
        return fs.readFileSync(filePath).toString("base64");
    }

    const nodesCopy = JSON.parse(JSON.stringify(workflow));

    const positivePromptNodeEntry = Object.entries(nodesCopy).find(([id, n]) =>
        n.class_type === "PrimitiveStringMultiline" && n._meta.title === "Prompt"
    );

    if (!positivePromptNodeEntry) throw new Error("Positive prompt node not found in workflow.json");

    const [positivePromptId, positivePromptNode] = positivePromptNodeEntry;
    positivePromptNode.inputs.value = prompt;

    const saveNodeEntry = Object.entries(nodesCopy).find(([id, n]) => n.class_type === "SaveImageWebsocket");
    if (!saveNodeEntry) throw new Error("SaveImageWebsocket node not found in workflow.json");
    const [saveNodeId, saveNode] = saveNodeEntry;
    saveNode.inputs.path = filePath;

    return new Promise((resolve, reject) => {
        const ws = new WebSocket("ws://127.0.0.1:8188/ws");

        ws.on("open", () => {
            console.log("Connected to ComfyUI, sending workflow");
            ws.send(JSON.stringify({
                type: "new_session"
            }));
        });

        ws.on("message", (data) => {
            let msg;
            try {
                msg = JSON.parse(data.toString());
            } catch (err) {
                return; 
            }

            if (msg.type === "session_created") {
                const sid = msg.sid;
                ws.send(JSON.stringify({
                    type: "process_nodes",
                    sid: sid,
                    nodes: nodesCopy,
                    outputs: [saveNodeId] 
                }));
            }

            if (msg.type === "process_nodes_done") {
                if (fs.existsSync(filePath)) {
                    const img = fs.readFileSync(filePath);
                    resolve(img.toString("base64"));
                    ws.close();
                } else {
                    reject(new Error(" Image file not found after workflow finished"));
                    ws.close();
                }
            }

            if (msg.type === "error") {
                reject(new Error(msg.error));
                ws.close();
            }
        });

        ws.on("error", (err) => reject(err));
    });
}


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


app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
