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

import mimetypes
import os
from google import genai
from google.genai import types

def save_binary_file(file_name, data):
    f = open(file_name, "wb")
    f.write(data)
    f.close()

COMFY_URL = "http://127.0.0.1:8188"
COMFY_OUTPUT_DIR = Path("D:/ComfyUI/output")
IMAGE_CACHE = Path(__file__).parent.parent / "image_cache"
IMAGE_CACHE.mkdir(exist_ok=True)
FRONTEND_IMAGE_DIR = Path(__file__).parent.parent / "../frontend/public/images"
FRONTEND_IMAGE_DIR.mkdir(exist_ok=True)

image_agent = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="image_agent",
    description="Generates prompt for image generation",
    instruction = (
    "You receive the name of a food ingredient or tool. "
    "Your task is to generate a high-quality but brief prompt for image generation. "

    "The style MUST be: flat 2D illustration, vector, cartoon, game asset, white background, single centered object. "
    "No realism, no photography, no 3D, no shadows, no reflections. "

    "Adapt the representation depending on the ingredient type: "
    "- Liquids → in a container (bottle, jug, glass) with label if appropriate. "
    "- Powders → in a small wooden bowl or container, optionally a small pile visible. "
    "- Solids (fruits, vegetables) → placed naturally on a surface. "
    "- Ice → 3–5 cubes in a simple bowl. "

    "Keep shapes simple, clean, minimal, with solid colors. "

    "Return ONLY the final prompt text. No JSON, no explanation."
    )
)

session_service = InMemorySessionService()
runner = Runner(agent=image_agent, app_name="recipe-game", session_service=session_service)

async def main():
    raw = sys.stdin.readline().strip()
    if not raw:
        raise RuntimeError("No input received from stdin!")

    data = json.loads(raw)
    ingredient = data["ingredient"]
    workflow = data.get("workflow", {})

    safe_name = ingredient.replace(" ", "_").lower()
    cached_path = IMAGE_CACHE / f"{safe_name}.png"
    frontend_path = FRONTEND_IMAGE_DIR / f"{safe_name}.png"

    if cached_path.exists() and frontend_path.exists():
        print(json.dumps({"image_path": str(frontend_path), "ingredient": ingredient}))
        return

    await session_service.create_session(app_name="recipe-game", user_id="user1", session_id="image")
    content = types.Content(
        role="user",
        parts=[types.Part(text=json.dumps({"ingredient": ingredient, "workflow": workflow}))]
    )
    events = runner.run(user_id="user1", session_id="image", new_message=content)

    updated_prompt = None
    try:
        async for e in events:
            if e.is_final_response():
                updated_prompt = e.content.parts[0].text
                break
    except TypeError:
        for e in events:
            if e.is_final_response():
                updated_prompt = e.content.parts[0].text
                break

    if not updated_prompt or updated_prompt.strip() == "":
        raise RuntimeError("LLM agent did not return any prompt!")

    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    part = types.Part(updated_prompt)
    contents = [types.Content(parts=[part])]

    config = types.GenerateContentConfig(
        image_config=types.ImageConfig(aspect_ratio="1:1", image_size="512x512"),
        response_modalities=["IMAGE"]
    )

    image_data = None
    for chunk in client.models.generate_content_stream(
        model="gemini-2.5-flash-image",
        contents=contents,
        config=config,
    ):
        if chunk.parts is None:
            continue
        part_chunk = chunk.parts[0]
        if part_chunk.inline_data and part_chunk.inline_data.data:
            image_data = part_chunk.inline_data.data
            break

    if image_data is None:
        raise RuntimeError("No image data returned from Gemini API!")

    save_binary_file(cached_path, image_data)
    save_binary_file(frontend_path, image_data)
    
    public_path = f"/images/{safe_name}.png"
    print(json.dumps({"image_path": public_path, "ingredient": ingredient}))

import asyncio
asyncio.run(main())

