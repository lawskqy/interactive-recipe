from dotenv import load_dotenv
import os
load_dotenv()

from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import sys, json, time, requests, asyncio

from pathlib import Path

session_service = InMemorySessionService()
USER_ID = "user1"
SESSION_ID = "session1"

async def init_session():
    await session_service.create_session(
        app_name="recipe_game",
        user_id="user1",
        session_id="session1"
    )

asyncio.run(init_session())

separator_agent = LlmAgent(
    name="separator_agent",
    model="gemini-2.5-flash-lite",
    description="Separates ingredients, tools and actions in a recieved step",
    instruction = """
        You receive ONE cooking recipe step.
        You also receive a list of ingredients which are used in that recipe.
        You MUST match ingredients from the step to the closest ingredient
        from the ingredients list.

        If the step contains a shortened form (e.g. "matcha"),
        map it to the closest allowed ingredient ("matcha powder").
        You must fill in the following object:

        {
            "ingredients": [],
            "tools": [],
            "actions": []
        }

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

        Return ONLY valid JSON.
        Do not explain anything.
        Do not add text before or after JSON.
        You MUST NOT return empty arrays if entities are clearly present.
        Your entire response MUST be valid JSON.
        Do not wrap it in markdown.
        Do not add ```json.
    """
)


runner = Runner(
    agent=separator_agent,
    session_service=session_service,
    app_name="recipe_game"
)


def main():

    raw_input = sys.stdin.read()

    try:
        data = json.loads(raw_input)
        step = data.get("step", "")
        context = data.get("context", [])

        payload = f"Recipe ingredients list: {', '.join(context)}\nUser step: {step}"

        content = types.Content(role="user", parts=[types.Part(text=payload)])

        events = runner.run(
            user_id=USER_ID,
            session_id=SESSION_ID,
            new_message=content
        )

        result = None

        for event in events:
            if event.is_final_response():

                if event.content and event.content.parts:
                    texts = []

                    for part in event.content.parts:
                        if hasattr(part, "text") and part.text:
                            texts.append(part.text)

                    if texts:
                        result = "".join(texts)

                break

        if not result:
            result = json.dumps({
                "ingredients": [],
                "tools": [],
                "actions": []
            })


        result = result.strip()

        start = result.find("{")
        end = result.rfind("}")

        if start != -1 and end != -1 and end > start:
            result = result[start:end+1]
        else:
            result = json.dumps({
                "ingredients": [],
                "tools": [],
                "actions": []
            })

        print(result)

    except Exception as e:
        print("Error:", e)
        print(json.dumps({"ingredients": [], "tools": [], "actions": []}))
        return

    try:
        parsed = json.loads(result)
    except Exception as e:
        print("Error:", e)
        parsed = {"ingredients": [], "tools": [], "actions": []}

if __name__ == "__main__":
    main()
