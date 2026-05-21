import sys
import re
import json as py_json

from typing import List, Optional
from pydantic import BaseModel, Field
import pydantic_core

from langchain_ollama import OllamaLLM
from langchain_text_splitters import json
from langchain.output_parsers import PydanticOutputParser
from langchain_core.exceptions import OutputParserException
from langchain.prompts import PromptTemplate

# ------------------- TOPIC PROMPT ------------------ #
TOPIC_PROMPT_TEMPLATE = """
You are an expert in mathematics.

Each Topic has to designed in using the following principles:
Topics → subtopics → concrete intuitions
Every idea has a visual or action anchor
Every stage prepares the next
Examples are illustrative, not procedural
Nothing here is "formula-first"

Rules:
1. Return ONLY valid JSON.
2. Do not add explanations.
3. Every sub-topic must contain:
   - sub_topic
   - examples (always a list)
4. If only one example exists, still return it as a list.
5. Preserve the original wording.
6. Give different kind, type of examples

Expected JSON format:

{{
  "topic": "string",
  "sub_topics": [
    {{
      "sub_topic": "string",
      "explanation": "string",
      "examples": ["string"]
    }}
  ]
}}

{topic}

{sub_topic}

{format_instructions}
"""

# ------------------- EXAMPLE EXPANSION PROMPT ------------------ #
EXAMPLE_EXPANSION_PROMPT_TEMPLATE = """
You are an expert mathematics educator.

Given a sub-topic and its existing examples, your task is to:
1. Analyze the existing examples to understand their style and format.
2. Generate NEW and DIVERSE additional examples that cover ALL possible permutations and combinations of:
   - Different contexts (food, sports, nature, classroom, money, time, animals, travel, etc.)
   - Different number ranges (single digit, double digit, large numbers)
   - Different presentation styles (word problems, visual descriptions, real-world scenarios, abstract)
   - Different difficulty levels (easy, medium, hard)
3. Do NOT repeat or rephrase existing examples.
4. Each new example must be distinct in context AND structure.

Rules:
1. Return ONLY valid JSON.
2. Do not add explanations outside JSON.
3. The output must contain ALL original examples PLUS the new ones.
4. Aim for at least 15-20 total examples covering all permutations.

Sub-topic: {sub_topic}
Explanation: {explanation}
Existing examples: {existing_examples}

Expected JSON format:
{{
  "sub_topic": "string",
  "explanation": "string",
  "examples": ["string", "string", ...]
}}

{format_instructions}
"""

# ------------------- DATA MODELS ------------------ #

class SubTopic(BaseModel):
    sub_topic: str = Field(..., description="Name of the sub-topic")
    explanation: str = Field(..., description="Explanation of the topic in detail")
    examples: List[str] = Field(
        default_factory=list,
        description="List of examples related to the sub-topic"
    )


class TopicData(BaseModel):
    topic: str = Field(..., description="Main topic name")
    sub_topics: Optional[List[SubTopic]]


# ------------------- MAIN CLASS ------------------ #

class MathsDataGenerator:
    def __init__(self):
        self.llm = None
        self.model_name = "ministral-3:3b"
        self.llm = OllamaLLM(model=self.model_name, format="json", temperature=0)

    def signal_handler(self, sig, frame):
        """Handles manual termination (Ctrl+C)."""
        sys.exit(0)

    async def generate(self, input_topic: str) -> TopicData:
        parser = PydanticOutputParser(pydantic_object=TopicData)

        prompt = PromptTemplate(
            template=TOPIC_PROMPT_TEMPLATE,
            input_variables=["topic"],
            partial_variables={"format_instructions": parser.get_format_instructions()}
        )

        chain = prompt | self.llm | parser

        max_attempts = 3
        response = None

        for attempt in range(1, max_attempts + 1):
            try:
                response = await chain.ainvoke({"topic": input_topic})
                return response
            except Exception as e:
                print(f"Attempt {attempt} failed: {e}")
                if attempt == max_attempts:
                    raise RuntimeError(f"Failed to generate lesson info after {max_attempts} tries. Last error: {e}")
                continue

        raise RuntimeError("Unexpected failure in generation loop.")

    async def expand_examples_for_subtopic(self, sub_topic: SubTopic) -> SubTopic:
        """
        Takes a SubTopic and uses the LLM to expand its examples list
        with all possible permutations and combinations of example types.
        """
        parser = PydanticOutputParser(pydantic_object=SubTopic)

        prompt = PromptTemplate(
            template=EXAMPLE_EXPANSION_PROMPT_TEMPLATE,
            input_variables=["sub_topic", "explanation", "existing_examples"],
            partial_variables={"format_instructions": parser.get_format_instructions()}
        )

        chain = prompt | self.llm | parser

        existing_examples_str = py_json.dumps(sub_topic.examples, indent=2)

        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                expanded = await chain.ainvoke({
                    "sub_topic": sub_topic.sub_topic,
                    "explanation": sub_topic.explanation,
                    "existing_examples": existing_examples_str,
                })
                print(f"  ✓ Expanded '{sub_topic.sub_topic}': {len(sub_topic.examples)} → {len(expanded.examples)} examples")
                return expanded
            except Exception as e:
                print(f"  Attempt {attempt} failed for sub-topic '{sub_topic.sub_topic}': {e}")
                if attempt == max_attempts:
                    print(f"  ✗ Could not expand '{sub_topic.sub_topic}', keeping original examples.")
                    return sub_topic
                continue

        return sub_topic

    async def expand_json_examples(self, input_json_path: str, output_json_path: str):
        """
        Reads a JSON file containing a list of TopicData objects (or a single object),
        expands the examples for each sub-topic using the LLM,
        and writes the enriched result to output_json_path.
        """
        try:
            with open(input_json_path, 'r', encoding='utf-8') as f:
                raw = py_json.load(f)
        except FileNotFoundError:
            print(f"Error: The file '{input_json_path}' was not found.")
            return
        except py_json.JSONDecodeError as e:
            print(f"Error: Failed to parse JSON from '{input_json_path}': {e}")
            return

        # Support both a single object and a list of objects
        if isinstance(raw, dict):
            raw_list = [raw]
        elif isinstance(raw, list):
            raw_list = raw
        else:
            print("Error: JSON root must be an object or an array of objects.")
            return

        # Parse into TopicData models
        topic_data_list: List[TopicData] = []
        for item in raw_list:
            try:
                topic_data_list.append(TopicData(**item))
            except Exception as e:
                print(f"Warning: Could not parse topic entry: {e}")

        print(f"Loaded {len(topic_data_list)} topic(s) from '{input_json_path}'.\n")

        # Expand examples for every sub-topic in every topic
        enriched_topics: List[TopicData] = []
        for topic_data in topic_data_list:
            print(f"Processing topic: {topic_data.topic}")
            expanded_sub_topics: List[SubTopic] = []

            if topic_data.sub_topics:
                for sub_topic in topic_data.sub_topics:
                    print(f"  Expanding examples for sub-topic: '{sub_topic.sub_topic}'")
                    expanded_sub = await self.expand_examples_for_subtopic(sub_topic)
                    expanded_sub_topics.append(expanded_sub)

            enriched = TopicData(
                topic=topic_data.topic,
                sub_topics=expanded_sub_topics
            )
            enriched_topics.append(enriched)
            print(f"  ✓ Done with topic: {topic_data.topic}\n")

        # Write enriched output
        json_string = pydantic_core.to_json(enriched_topics, indent=2).decode("utf-8")
        with open(output_json_path, 'w', encoding='utf-8') as out_f:
            out_f.write(json_string)

        print(f"Enriched JSON written to '{output_json_path}'.")

    async def read_math_syllabus(self, file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()

            pattern = r'(?=Topic:)|=+'
            sections = re.split(pattern, content)

            topic_list = []
            for section in sections:
                clean_section = section.strip()

                if clean_section and clean_section.startswith("Topic:"):
                    print("--- START OF TOPIC ---")
                    topic_data = await self.generate(clean_section)
                    print(topic_data.model_dump_json(indent=2))
                    topic_list.append(topic_data)
                    print("--- END OF TOPIC ---\n")

            with open('output.json', 'a', encoding='utf-8') as output_file:
                json_string = pydantic_core.to_json(topic_list, indent=2).decode("utf-8")
                output_file.write(json_string)

        except FileNotFoundError:
            print(f"Error: The file '{file_path}' was not found.")


async def main():
    math_generator = MathsDataGenerator()

    # --- Option 1: Generate from syllabus text file ---
    # await math_generator.read_math_syllabus('maths_syllabus.txt')

    # --- Option 2: Read existing JSON and expand examples ---
    await math_generator.expand_json_examples(
        input_json_path='input_topics.json',    # Your input JSON file
        output_json_path='expanded_output.json'  # Enriched output
    )


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())