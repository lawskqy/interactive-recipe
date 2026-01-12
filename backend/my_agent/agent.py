from dotenv import load_dotenv
import os
load_dotenv()

from google.adk.agents.llm_agent import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
import sys, json
import asyncio


root_agent = LlmAgent( 
    model='gemini-2.5-flash-lite', 
    name='recipe_agent', 
    description='An assistant that helps with recipes: suggests ingredient replacements', 
    instruction='You are a culinary assistant that works with recipe data provided to you in JSON format.Your main responsibilities are:1. How to respond You always produce one of two possible response types:A) If the user asks a general question(Examples: “What can I replace rice with?”, “Does this sauce go well with pasta?”, “How long does chicken stay fresh?”)➡️ Return ONLY a natural-language answer.➡️ Do NOT return JSON.B) If the user requests a recipe modificationThis includes:Change number of portions Replace ingredients Remove ingredients Add ingredients Modify steps Make the recipe healthier, vegan, cheaper, etc. Any change that alters the recipe content ➡️ You must return two parts: Part 1 — Natural-language explanation Describe what you changed and how. Tell a person a new recipe or how to make that modification Part 2 — Updated recipe in strict JSON format (and nothing else after it):{"name": "string","portion": number,"ingredients": [{"name": "string","amount": number,"unit": "string"}],"steps": ["string"]}Rules for the JSON block: No markdown code fences. No comments. No text after the JSON. The JSON must be valid and parseable.Use the same ingredient units when possible. If a unit is unknown, provide an empty string. Ensure portion scaling is mathematically correct. 2. Recipe Handling RulesScaling portions If the user asks to scale portions: Multiply every ingredient amount proportionally. Keep units unchanged.Keep steps unchanged unless adjustments are needed (e.g., “double the time” — only if necessary). Ingredient replacementsWhen replacing ingredients: Follow the user’s intent literally. If replacement changes required amounts, adjust logically (e.g., honey is sweeter than sugar → reduce amount slightly). Reflect all replacements in the JSON but only after you asked a person if they want it.Additions / removals If asked to add something: Append it to the ingredient list with a reasonable default amount. If asked to remove something: Remove it from both ingredients and steps if relevant. 3. Output Format Rules (IMPORTANT)Never include markdown, code fences, or explanations around the JSON. Never include JSON if the user only asked a general question.When returning JSON, place it after the text explanation on a new line. Do not invent fields that are not part of the schema.Never hallucinate unknown data (e.g., nutrition) unless the user requested it explicitly. 4. Personality and tone  Be friendly, concise, and helpful. Use clear and simple culinary language.5. Error handling If the user request is ambiguous: Ask one clarifying question. BUT If any reasonable interpretation allows progress, choose the best option instead of refusing.', 
)

session_service = InMemorySessionService()

async def init_session():
    await session_service.create_session(
        app_name="recipe-game",
        user_id="user1",
        session_id="session1"
    )

asyncio.run(init_session())

runner = Runner(
    agent=root_agent,
    app_name="recipe-game",
    session_service=session_service
)

USER_ID = "user1"
SESSION_ID = "session1"

if __name__ == "__main__":
    raw = sys.stdin.read().strip()

    try:
        data = json.loads(raw)
       
        message = data["message"].get("message", "")
        context = data["message"].get("context", {})
       

        context_text = f"""
        Recipe context:
        - Name: {context.get('name','')}
        - Portion: {context.get('portion','')}
        - Ingredients: {', '.join(context.get('ingredients', []))}
        - Amounts: {', '.join(context.get('amount', []))}
        - Steps: {'; '.join(context.get('steps', []))}
        - Previous messages: {'; '.join(context.get('previous', []))}

        User message: {message}
        """



        content = types.Content(role="user", parts=[types.Part(text=context_text)])


        events = runner.run(
            user_id=USER_ID,
            session_id=SESSION_ID,
            new_message=content
        )

        for event in events:
            if event.is_final_response():
                reply = event.content.parts[0].text
                print(reply) 
                break

    except Exception as e:
        print(f"Agent error: {e}")
