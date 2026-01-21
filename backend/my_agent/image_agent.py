from dotenv import load_dotenv
import os
load_dotenv()

from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import sys, json, time, requests, asyncio
from pathlib import Path

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
        "Your task: modify only the prompt in the workflow to generate a transparent, isolated, 2D image of that ingredient. "
        "Enhance style, lighting, composition, but do not change the ingredient. "
        "Send the modified workflow **directly to ComfyUI via HTTP POST**, do not return JSON or text to this script."
    )
)

session_service = InMemorySessionService()
runner = Runner(agent=image_agent, app_name="recipe-game", session_service=session_service)

async def main():
    await session_service.create_session(app_name="recipe-game", user_id="user1", session_id="image")

    raw = sys.stdin.read().strip()
    data = json.loads(raw)
    ingredient = data["ingredient"]
    workflow = data["workflow"]

    safe = ingredient.replace(" ", "_").lower()
    cached = IMAGE_CACHE / f"{safe}.png"
    if cached.exists():
        print(str(cached))
        return

    content = types.Content(role="user", parts=[types.Part(text=json.dumps({"ingredient": ingredient, "workflow": workflow}))])
    runner.run(user_id="user1", session_id="image", new_message=content)

    for _ in range(60):
        pngs = sorted(COMFY_OUTPUT_DIR.glob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
        if pngs:
            latest = pngs[0]
            cached.write_bytes(latest.read_bytes())
            print(str(cached))
            return
        time.sleep(1)

    raise RuntimeError("Image generation timed out")

asyncio.run(main())
