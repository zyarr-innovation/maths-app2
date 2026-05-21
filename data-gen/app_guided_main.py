import os
import sys
import re
import json as py_json
import glob

from typing import List
from pydantic import BaseModel, Field

from langchain_ollama import OllamaLLM
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate


# ------------------- EXAMPLE EXPANSION PROMPT ------------------ #
EXAMPLE_PROMPT_TEMPLATE = """
You are an expert mathematics educator specializing in converting math examples into guided learning steps.

Your task is to transform the GIVEN example into smaller guided reasoning steps.

STRICT RULES:
1. You MUST use the exact input example provided.
2. DO NOT create a new math problem.
3. DO NOT change the story, objects, numbers, or mathematical operations.
4. DO NOT invent new values or scenarios.
5. DO NOT rewrite the example into a different question.
6. The "example" field in the output MUST be EXACTLY identical to the input example.
7. Only generate guided reasoning steps for the provided example.
8. Break the example into clear sequential steps.
9. Each step should represent one small reasoning action.
10. Use simple student-friendly language.
11. Wherever learner input is expected, wrap the expected answer using double underscores.
12. The format __value__ means the learner should enter that value.
13. Use double underscores only for learner inputs.
14. Return ONLY valid JSON matching the required schema.

Example Input:
Place 5 red pom-poms in a basket and ask:
'If I remove two, how many will remain if I add three more?'

Example Output:
{{
  "example": "Place 5 red pom-poms in a basket and ask: 'If I remove two, how many will remain if I add three more?'",
  "steps": [
    "There are __5__ pom-poms in the basket.",
    "I remove __2__ pom-poms from the basket.",
    "Now __5__ - __2__ = __3__ pom-poms remain.",
    "Next, I add __3__ more pom-poms.",
    "Now __3__ + __3__ = __6__ pom-poms are in the basket."
  ]
}}

Input Example:
{example}

{format_instructions}
"""


# ------------------- DATA MODELS ------------------ #
class GuidedSteps(BaseModel):
    example: str = Field(..., description="Original example")
    steps: List[str]


# ------------------- MAIN CLASS ------------------ #
class MathsExampleDataGenerator:
    def __init__(self):
        self.model_name = "ministral-3:3b"

        self.llm = OllamaLLM(
            model=self.model_name,
            format="json",
            temperature=0
        )

    async def generate(
        self,
        topic: str,
        sub_topic: str,
        example: str
    ) -> GuidedSteps:

        parser = PydanticOutputParser(
            pydantic_object=GuidedSteps
        )

        prompt = PromptTemplate(
            template=EXAMPLE_PROMPT_TEMPLATE,
            input_variables=["topic", "sub_topic", "example"],
            partial_variables={
                "format_instructions": parser.get_format_instructions()
            }
        )

        chain = prompt | self.llm | parser

        max_attempts = 3

        for attempt in range(1, max_attempts + 1):

            try:
                response = await chain.ainvoke({
                    "topic": topic,
                    "sub_topic": sub_topic,
                    "example": example
                })

                return response

            except Exception as e:

                print(f"Attempt {attempt} failed: {e}")

                if attempt == max_attempts:
                    raise RuntimeError(
                        f"Failed after {max_attempts} attempts"
                    )

        raise RuntimeError("Unexpected generation failure")

    def get_file_path(self, base_filename):
        pattern = f"[0-9]*.{base_filename}.json"

        for filepath in glob.glob(pattern):
            if os.path.isfile(filepath):
                yield filepath
                
    async def read_math_syllabus(self, input_json_path):

        try:
            # ---------------- READ INPUT JSON ---------------- #
            with open(input_json_path, "r", encoding="utf-8") as file:
                data = py_json.load(file)

            # ---------------- PROCESS DATA ---------------- #
            processed_file = 0
            for count_topic in range(len(data)):
                topic_item = data[count_topic]
                
                # ---------------- CREATE FILENAME JSON ---------------- #
                filename = re.sub(r'[^a-zA-Z0-9_\- ]', '', topic_item['topic']).strip().replace(' ', '_')
                filename = re.sub(r'^\d+[\._-]*', '', filename)
                file_paths = list(self.get_file_path(filename))
                if len(file_paths):
                    print(f"file {file_paths} already processed")
                    count_topic += 1
                    continue
                print(f"Processing file =========================={filename}")
                processed_file += 1
                if processed_file == 3:
                    break
                
                for count_subtopic in range(len(topic_item["sub_topics"])):
                    sub_topic_item = topic_item["sub_topics"][count_subtopic]
                    examples = sub_topic_item.get("examples", [])

                    transformed_examples = []
                    for example in examples:
                        print(f"\nProcessing Example:")
                        print(example)
                        try:
                            guided_result = await self.generate(
                                topic=topic_item,
                                sub_topic=sub_topic_item.get("sub_topic", ""),
                                example=example
                            )
                            transformed_examples.append(guided_result.model_dump())

                        except Exception as e:
                            print(f"Error processing example: {e}")
                            transformed_examples.append({
                                "example": example,
                                "guided_examples": None
                            })

                    # Replace original examples array
                    sub_topic_item["examples"] = transformed_examples

                # ---------------- WRITE OUTPUT JSON ---------------- #
                output_json_path = f"{count_topic}.{filename}.json"
                with open(output_json_path, "w", encoding="utf-8") as outfile:
                    py_json.dump(
                        topic_item,
                        outfile,
                        indent=2,
                        ensure_ascii=False
                    )
                    
                print(f"\nOutput written to: {output_json_path}")

        except FileNotFoundError:
            print(f"Error: File '{input_json_path}' not found.")

        except Exception as e:
            print(f"Unexpected error: {e}")


# ------------------- MAIN ------------------ #
async def main():
    math_generator = MathsExampleDataGenerator()
    await math_generator.read_math_syllabus(input_json_path='expanded_output.json')
        
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
    