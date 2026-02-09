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
        You receive ONE step of a cooking recipe.

        Your task:
        - Extract ingredients used in this step
        - Extract tools used in this step
        - Extract actions performed in this step
        - If there is no tool named in step just make a tool out of action, example: step is sift matcha, there is no tool, but there is action sift so it is understandable that a tool is a sifter

        Example: 
            Step: "Sift matcha"
            Expected JSON: {"ingredients":["matcha"], "tools":["sifter"], "actions":["sift"]}

        
        Rules:
        - Return ONLY valid JSON
        - Do NOT include explanations
        - Do NOT include markdown
        - Do NOT include any text outside JSON

        The JSON MUST follow exactly this schema:

        {
        "ingredients": [],
        "tools": [],
        "actions": []
        }
    """
)
