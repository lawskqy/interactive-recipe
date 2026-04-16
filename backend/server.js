const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env") }); 
const fs = require("fs");
const agentPath = path.join(__dirname, "my_agent", "agent.py");
const imageAgentPath = path.join(__dirname, "my_agent", "image_agent.py");
const separationAgentPath = path.join(__dirname, "my_agent", "separation_agent.py")
const app = express();
const port = 8080;
const PYTHON = "C:\\Users\\devil\\AppData\\Local\\Programs\\Python\\Python314\\python.exe";
const { GoogleGenAI } = require("@google/genai");
const crypto = require("crypto");

const FRONTEND_IMAGE_DIR = path.join(__dirname, "../frontend/public/images");
app.use("/images", express.static(FRONTEND_IMAGE_DIR));

const COMFY_URL = "http://127.0.0.1:8188"
const COMFY_OUTPUT_DIR = path.join("D:/ComfyUI/output")

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const makeHash = (text) => {
    return crypto.createHash("md5").update(text).digest("hex").slice(0, 8);
};

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

const WORKFLOW_PATH = path.join(__dirname, "segment-anything.json");

const workflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"));

function runImageAgent(ingredient) {
    console.log("runimage");
    return new Promise((resolve, reject) => {
        const python = spawn(PYTHON, [imageAgentPath], {
            stdio: ["pipe", "pipe", "pipe"],
            env: { 
              ...process.env,  
            }
        });
        console.log("works")
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
        }) + "\n");
        python.stdin.end();
    });
};

async function sendWorkflowToComfy(workflow) {
    const fetch = global.fetch || (await import("node-fetch")).default;

    const res = await fetch(`${COMFY_URL}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        prompt: workflow,
        client_id: "node-backend"
        })
    });

    const data = await res.json();
    return data.prompt_id;
};

function extractComfyImage(result) {
    const node = result?.outputs?.["14"];
    const img = node?.images?.[0];

    if (!img) return null;

    return {
        filename: img.filename,
        subfolder: img.subfolder || "",
        type: img.type || "output"
    };
};

async function waitForResult(promptId) {
    const fetch = global.fetch || (await import("node-fetch")).default;

    while (true) {
        const res = await fetch(`${COMFY_URL}/history/${promptId}`);
        const data = await res.json();

        if (data?.[promptId]) {
        return data[promptId];
        }

        await new Promise((r) => setTimeout(r, 1000));
    }
};

app.post("/generate-and-segment", async (req, res) => {
    const { ingredient } = req.body;

    if (!ingredient || typeof ingredient !== "string") {
        return res.status(400).json({ error: "Invalid ingredient" });
    }

    const safeName = ingredient
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w_]/g, "")
        .slice(0, 40);

    const baseFile = path.join(FRONTEND_IMAGE_DIR, `${safeName}.png`);
    const segFile = path.join(FRONTEND_IMAGE_DIR, `${safeName}_seg.png`);

    try {
        console.log(`[PIPELINE] Start: ${ingredient}`);

        if (!fs.existsSync(baseFile)) {
            const raw = await runImageAgent(ingredient);
            const parsed = JSON.parse(raw);

            if (!parsed?.image_path) {
                return res.status(500).json({ error: "No base image path" });
            }

            if (!fs.existsSync(baseFile)) {
                return res.status(500).json({ error: "Base image not created" });
            }
        }

        console.log("[PIPELINE] running segmentation...");

        const baseWorkflow = JSON.parse(fs.readFileSync(WORKFLOW_PATH, "utf8"));
        const workflow = structuredClone(baseWorkflow);

        workflow["2"].inputs.image = baseFile;
        workflow["3"].inputs.prompt =
            `${ingredient} in a bowl, isolated object, clean background`;

        const promptId = await sendWorkflowToComfy(workflow);
        const result = await waitForResult(promptId);

        if (!result) {
            return res.status(500).json({ error: "No Comfy result" });
        }

        const imgInfo = extractComfyImage(result);

        if (!imgInfo) {
            return res.status(500).json({ error: "No image in Comfy output" });
        }

        const comfyPath = path.join(
            COMFY_OUTPUT_DIR,
            imgInfo.subfolder,
            imgInfo.filename
        );

        if (!fs.existsSync(comfyPath)) {
            return res.status(500).json({ error: "Comfy file not found", comfyPath });
        }

        fs.copyFileSync(comfyPath, segFile);

        console.log(`[PIPELINE] Done: ${segFile}`);

        return res.json({
            ingredient,
            image_path: `/images/${path.basename(segFile)}`
        });

    } catch (e) {
        console.error("[PIPELINE ERROR]", e);

        return res.status(500).json({
            error: "Pipeline failed",
            details: e.message
        });
    }
});

const toFileName = (text) => {
    return text
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w_]/g, "")
        .slice(0, 40); 
};

const saveImage = (result, name, index, hash) => {
    const base64 = result.image; 
    const buffer = Buffer.from(base64, "base64");

    const fileName = `${toFileName(name)}_step_${index}_${hash}.png`;
    const filePath = path.join(FRONTEND_IMAGE_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    return `/images/${fileName}`; 
};

app.post("/generate-result-image", async (req, res) => {
    const { step, previous, index, name } = req.body;

    const hash = makeHash(step + (previous || ""));

    const fileName = `${toFileName(name)}_step_${index}_${hash}.png`;
    const filePath = path.join(FRONTEND_IMAGE_DIR, fileName);

    if (fs.existsSync(filePath)) {
        console.log("Using cached image:", fileName);
        return res.json({ image_path: `/images/${fileName}` });
    }

    try {
        const prompt = `
        Cooking step: ${step}
        Generate the result of this step as an image.

        STYLE (must stay identical across steps):
        flat 2D illustration, minimalistic, dark academia palette,
        muted browns, beiges, dark greens, soft shadows,
        white background, no extra objects

        COMPOSITION:
        single centered object only
        same framing and scale every time

        If an image is provided, use it as strict style reference.
        `;

        const parts = [{ text: prompt }];

        let base64Previous = null;
        if (previous) {
            const prevFile = previous.startsWith("/")
                ? path.join(FRONTEND_IMAGE_DIR, previous.replace("/images/", ""))
                : null;

            if (prevFile && fs.existsSync(prevFile)) {
                base64Previous = fs.readFileSync(prevFile, { encoding: "base64" });
            }
        } else {
            const recipeImgFile = path.join(FRONTEND_IMAGE_DIR, `${toFileName(name)}.png`);
            if (fs.existsSync(recipeImgFile)) {
                base64Previous = fs.readFileSync(recipeImgFile, { encoding: "base64" });
            } else {
                console.warn("Recipe image not found:", recipeImgFile);
            }
        }

        if (base64Previous) {
            parts.push({
                inlineData: {
                    mimeType: "image/png",
                    data: base64Previous
                }
            });
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [
                {
                    parts
                }
            ]
        });

        const responseParts = response.candidates?.[0]?.content?.parts || [];
        const imagePart = responseParts.find(p => p.inlineData);

        if (!imagePart) {
            throw new Error("No image returned from Gemini");
        }

        const base64 = imagePart.inlineData.data;
        const imagePath = saveImage({ image: base64 }, name, index, hash);

        res.json({ image_path: imagePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "generation failed" });
    }
});

app.post("/separate", (req, res) => {
    const payload = JSON.stringify(req.body);

    const pythonProcess = spawn(PYTHON, [separationAgentPath], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
    });

    let output = "";

    pythonProcess.stdout.on("data", (data) => {
        output += data.toString();
        console.log("RAW output from Python:", output);
    });

    pythonProcess.stderr.on("data", (data) => {
        console.error("Python error:", data.toString());
    });

    pythonProcess.on("close", () => {
        const safeOutput = output.replace(/AIzaSy\w{32}/g, "").trim();

        let parsed;
        
        try {
            parsed = JSON.parse(safeOutput);
        } catch (e) {
            console.error("Failed to parse Python JSON:", e);
            parsed = { ingredients: [], tools: [], actions: [] };
        }

        res.json(parsed);
    });

    pythonProcess.stdin.write(payload);
    pythonProcess.stdin.end();
});

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));


