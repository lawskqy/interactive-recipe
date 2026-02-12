from dotenv import load_dotenv
import os
load_dotenv()

from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import sys, json, time, requests
import asyncio

from pathlib import Path
from pydantic import BaseModel
from typing import List

schema = types.Schema(
    type="object",
    properties={
        "ingredients": types.Schema(
            type="array",
            items=types.Schema(type="string")
        ),
        "tools": types.Schema(
            type="array",
            items=types.Schema(type="string")
        ),
        "actions": types.Schema(
            type="array",
            items=types.Schema(type="string")
        ),
    },
    required=["ingredients", "tools", "actions"],
)

separation_agent = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="separation_agent",
    description="Separates ingredients, tools and actions in a recieved step",
    instruction = """
        You receive ONE cooking recipe step as plain text.

You MUST extract:

1. Ingredients mentioned in the step
2. Tools mentioned or implied
3. Actions (verbs describing cooking actions)

Rules:

- Ingredients are food items (matcha powder, water, flour, sugar, etc.)
- Tools are physical kitchen objects (whisk, bowl, knife, pan, sifter, spoon, etc.)
- If a tool is not explicitly mentioned but clearly implied by the action,
  you MUST infer it.

Examples:

Step: Whisk matcha powder with water
Output:
{
  "ingredients": ["matcha powder", "water"],
  "tools": ["whisk"],
  "actions": ["whisk"]
}

Step: Sift flour into bowl
Output:
{
  "ingredients": ["flour"],
  "tools": ["sifter", "bowl"],
  "actions": ["sift"]
}

You MUST NOT return empty arrays if entities are clearly present.
Return valid JSON only.
    """
)

session_service = InMemorySessionService()
runner = Runner(
    agent=separation_agent,
    session_service=session_service,
    app_name="recipe_game"
)

generation_config = types.GenerationConfig(
    response_mime_type="application/json",
    response_schema=schema,
)

async def main():
    raw_input = sys.stdin.read()

    try:
        data = json.loads(raw_input)
        step = data.get("step", "")
    except:
        print(json.dumps({"ingredients": [], "tools": [], "actions": []}))
        return

    try:
        response = await runner.run(
            step,
            generation_config=generation_config
        )

        structured = response.output  # 🔥 Уже dict
        print(json.dumps(structured))

    except Exception as e:
        print("ERROR:", str(e), file=sys.stderr)
        print(json.dumps({"ingredients": [], "tools": [], "actions": []}))



if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

