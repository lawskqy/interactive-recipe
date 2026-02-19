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

        You MUST NOT return empty arrays if entities are clearly present.
        You always return a valid JSON.
    """
)



validator_agent=LlmAgent(
    name="validator_agent",
    model="gemini-2.5-flash-lite",
    instruction="""
    You recieve an output from separator_agent.
    You must check if it is a valid JSON.
    The structure of JSON file should meet these expectations:

    {
        "ingredients": [],
        "tools": [],
        "actions": []
    }

    It has to be a non empty object containing 3 arrays of strings.
    You must return ONLY the validated JSON as text. Do not use function_call.
    """
)


orchestrator = LlmAgent(
    name="orchestrator",
    model="gemini-2.5-flash-lite",
    instruction="""
        You are the orchestrator of a multi-agent recipe pipeline.

        You MUST follow this strict sequence:

        STEP 1:
        Call separator_agent with the user's recipe step.
        Do NOT generate extraction yourself.

        STEP 2:
        Take the JSON returned by separator_agent.
        Call validator_agent and pass that JSON as input.

        STEP 3:
        Return ONLY the final JSON returned by validator_agent.

        You are NOT allowed to skip steps.
        You are NOT allowed to generate the JSON directly.
        You MUST use the tools.
    """,
    sub_agents=[separator_agent, validator_agent]
)

orchestrator_runner = Runner(
    agent=orchestrator,
    session_service=session_service,
    app_name="recipe_game"
)


async def main():

    await session_service.create_session(
        app_name="recipe_game",
        user_id=USER_ID,
        session_id=SESSION_ID
    )

    raw_input = sys.stdin.read()

    try:
        data = json.loads(raw_input)
        step = data.get("step", "")
        context = data.get("context", [])

        payload = f"Recipe ingredients list: {', '.join(context)}\nUser step: {step}"

        content = types.Content(role="user", parts=[types.Part(text=payload)])

        events = orchestrator_runner.run(
            user_id=USER_ID,
            session_id=SESSION_ID,
            new_message=content
        )

        result = None
        for event in events:
            if event.is_final_response():
                result = event.content.parts[0].text
                print(result)
                break

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
    asyncio.run(main())
