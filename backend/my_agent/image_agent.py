from dotenv import load_dotenv
import os
load_dotenv()

from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import sys, json, time, requests, asyncio, re
from pathlib import Path
import base64

COMFY_URL = "http://127.0.0.1:8188"
COMFY_OUTPUT_DIR = Path("D:/ComfyUI/output")
IMAGE_CACHE = Path(__file__).parent.parent / "image_cache"
IMAGE_CACHE.mkdir(exist_ok=True)

image_agent = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="image_agent",
    description="Generates ingredient images via ComfyUI",
    instruction=(
        "You receive a JSON workflow and the name of a single ingredient. "
        "Modify only the promptb part in the workflow to generate a transparent, isolated, 2D image of that ingredient. "
        "Enhance style, lighting, composition, but do not change the ingredient. "
        "Return the full modified workflow as the same JSON which was before to the script. Do not attempt to POST to ComfyUI."
        "You must return valid JSON containing the modified workflow ONLY, "
        "no extra text, no commentary, no code fences."
    )
)

session_service = InMemorySessionService()
runner = Runner(agent=image_agent, app_name="recipe-game", session_service=session_service)

async def main():
    raw = sys.stdin.read().strip()
    if not raw:
        raise RuntimeError("No input received from stdin!")
    data = json.loads(raw)
    ingredient = data["ingredient"]
    workflow = data["workflow"]
    safe_name = ingredient.replace(" ", "_").lower()
    cached = IMAGE_CACHE / f"{safe_name}.png"
    if cached.exists():
        img_bytes = cached.read_bytes()
        img_b64 = base64.b64encode(img_bytes).decode("utf-8")

        print(json.dumps({
            "image": img_b64,
            "ingredient": ingredient
        }))
        return

    await session_service.create_session(app_name="recipe-game", user_id="user1", session_id="image")
    content = types.Content(
        role="user",
        parts=[types.Part(text=json.dumps({"ingredient": ingredient, "workflow": workflow}))]
    )
    events = runner.run(user_id="user1", session_id="image", new_message=content)

    updated_workflow_text = None
    try:
        async for e in events:
            if e.is_final_response():
                updated_workflow_text = e.content.parts[0].text
                break
    except TypeError:
        for e in events:
            if e.is_final_response():
                updated_workflow_text = e.content.parts[0].text
                break

    if not updated_workflow_text or updated_workflow_text.strip() == "":
        raise RuntimeError("LLM agent did not return any workflow!")

    cleaned_text = re.sub(r"^```json\s*|\s*```$", "", updated_workflow_text.strip(), flags=re.MULTILINE)

    def extract_first_json(text: str):
        text = text.strip()
        decoder = json.JSONDecoder()
        try:
            obj, idx = decoder.raw_decode(text)
            return obj
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Cannot decode JSON: {e}\nText: {text}")

    updated_workflow = extract_first_json(cleaned_text)

    resp = requests.post(f"{COMFY_URL}/prompt", json={"prompt": updated_workflow})
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]

    for _ in range(60):
        hist = requests.get(f"{COMFY_URL}/history/{prompt_id}").json()
        item = hist.get(prompt_id, {})
        if item.get("status", {}).get("completed"):
            break
        time.sleep(1)
    else:
        raise RuntimeError("Image generation timed out")

    pngs = sorted(COMFY_OUTPUT_DIR.glob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not pngs:
        raise RuntimeError("No PNGs found in Comfy output directory!")

    latest = pngs[0]
    cached.write_bytes(latest.read_bytes())

    img_bytes = cached.read_bytes()
    img_b64 = base64.b64encode(img_bytes).decode("utf-8")

    print(json.dumps({
        "image": img_b64,
        "ingredient": ingredient
    }))

asyncio.run(main())

