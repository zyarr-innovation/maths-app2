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
Nothing here is “formula-first”

Rules:
1. Return ONLY valid JSON.
2. Do not add explanations.
3. Every sub-topic must contain:
   - sub_topic
   - examples (always a list)
4. If only one example exists, still return it as a list.
5. Preserve the original wording.

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

I need a beautiful explanation and as many examples per sub-topic as possible.

{format_instructions}
"""
# ------------------- DATA MODEL ------------------ #

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
        # Initialize response to None to track failure
        response = None

        for attempt in range(1, max_attempts + 1):
            try:
                # Use ainvoke for async
                response = await chain.ainvoke({"topic": input_topic})
                # If we get here, the parse was successful
                return response 
            except Exception as e:
                print(f"Attempt {attempt} failed: {e}")
                if attempt == max_attempts:
                    raise RuntimeError(f"Failed to generate lesson info after {max_attempts} tries. Last error: {e}")
                continue

        # This part should theoretically not be reached due to the raise above
        raise RuntimeError("Unexpected failure in generation loop.")

    async def read_math_syllabus(self, file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()

            # Regex explanation:
            # (?=Topic:) -> Lookahead for the word "Topic:" (splits before it)
            # |          -> OR
            # =+         -> One or more "=" characters
            pattern = r'(?=Topic:)|=+'
            
            # Split the content
            sections = re.split(pattern, content)

            topic_list = []
            for section in sections:
                # Clean up whitespace and ignore empty segments
                clean_section = section.strip()
                
                if clean_section and clean_section.startswith("Topic:"):
                    print("--- START OF TOPIC ---")
                    topic_data = await self.generate(clean_section)
                    print(topic_data.model_dump_json(indent=2))
                    topic_list.append(topic_data)
                    print("--- END OF TOPIC ---\n")

            with open('output.json', 'a', encoding='utf-8') as output_file:
                # This handles the serialization of the entire list of models automatically
                json_string = pydantic_core.to_json(topic_list, indent=2).decode("utf-8")
                output_file.write(json_string)
                
        except FileNotFoundError:
            print(f"Error: The file '{file_path}' was not found.")
        
async def main():
    math_generator = MathsDataGenerator()
    await math_generator.read_math_syllabus('maths_syllabus.txt')
    # topic_data = await math_generator.generate()
    # print(topic_data.model_dump_json(indent=2))


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())