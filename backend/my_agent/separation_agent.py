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

separation_agent = LlmAgent(
    model="gemini-2.5-flash-lite",
    name="separation_agent",
    description="Separates ingredients, tools and actions in a recieved step",
    instruction = """
        You receive a string which represents one step of a cooking recipe.

        Your task:
        - Extract ingredients used in this step
        - Extract tools used in this step
        - Extract actions performed in this step
        - If no tool is explicitly mentioned, infer a reasonable tool from the action and include it in the tools array, example: step is sift matcha, there is no tool, but there is action sift so it is understandable that a tool is a sifter

        Example: 
            Step: "Sift matcha"
            Expected JSON: {"ingredients":["matcha"], "tools":["sifter"], "actions":["sift"]}

            Step: "Whisk matcha powder with water"
            Expected JSON: {"ingredients":["matcha powder","water"], "tools":["whisk"], "actions":["whisk"]}

            Step: "Sift flour into bowl"
            Expected JSON: {"ingredients":["flour"], "tools":["sifter","bowl"], "actions":["sift"]}


        Rules:
        - Always return valid JSON with non-empty arrays if you detect anything, and return empty arrays only if truly nothing is present.
        - Do NOT include explanations
        - Do NOT include markdown
        - Do NOT include any text outside JSON
    """
)

async def main():
    raw_input = sys.stdin.read()

    
    session_service = InMemorySessionService()
    runner = Runner(agent=separation_agent, session_service=session_service, app_name="recipe_game")

    try:
        response = await runner.run(step)  

        if hasattr(response, "output_text"):
            text = response.output_text
        elif hasattr(response, "text"):
            text = response.text
        elif isinstance(response, str):
            text = response
        else:
            text = str(response)

        text = text.strip()
        text = text.replace("```json", "").replace("```", "").strip()

        print("RAW MODEL RESPONSE:", text, file=sys.stderr)

        try:
            json_start = text.index("{")
            json_text = text[json_start:]
            parsed = json.loads(json_text)
            print(json.dumps(parsed))
        except:
            print(json.dumps({"ingredients": [], "tools": [], "actions": []}))

    except:
        print(json.dumps({"ingredients": [], "tools": [], "actions": []}))

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

