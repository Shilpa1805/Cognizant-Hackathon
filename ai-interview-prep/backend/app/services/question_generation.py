import json
import re
import time
import uuid

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.schemas import Question
from app.schemas.answers import FollowUpRequest
from app.services.vector_store import vector_store
from app.config import settings


class GenerationError(Exception):
    """Raised when all generation attempts fail."""
    pass


class GeneratedQuestionPayload(BaseModel):
    role: str = Field(description="Target engineering role")
    topic: str = Field(description="Specific technical topic")
    difficulty: str = Field(description="Difficulty level: Easy, Medium, or Hard")
    question_text: str = Field(description="Clear interview question")
    reference_answer: str = Field(description="Comprehensive reference answer")


# List of models in order of priority (lite/flash models experience less queue congestion)
FALLBACK_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.7-flash",
]


def _build_prompt(
    role: str,
    topic: str,
    difficulty: str,
    examples_context: str,
    adaptation_notes: str,
) -> str:
    """
    Builds a grounded Gemini prompt.
    If adaptation_notes is non-empty, it tells Gemini exactly what adjustments
    to make (e.g. wrong difficulty, topic missing, role was mapped).
    """
    adaptation_block = (
        f"\nIMPORTANT ADAPTATION INSTRUCTIONS:\n{adaptation_notes}\n"
        if adaptation_notes.strip()
        else ""
    )

    examples_block = (
        f"Grounding Examples (use these to match style, depth, and format):\n{examples_context}"
        if examples_context.strip()
        else "No grounding examples available — generate from scratch."
    )

    return f"""You are an expert technical interviewer. Your job is to generate 1 high-quality interview question.

TARGET PARAMETERS:
- Role: {role}
- Topic: {topic}
- Difficulty: {difficulty}
{adaptation_block}
{examples_block}

RULES:
1. The question MUST be exactly {difficulty} difficulty — not easier, not harder.
2. The question MUST be relevant to {role} working on {topic}.
3. The reference_answer must be thorough and technically accurate.
4. Do NOT copy the example questions — generate something new and distinct.
5. Match the style and depth of the examples.

Return valid JSON with exactly these keys:
  "role", "topic", "difficulty", "question_text", "reference_answer"
"""


def generate_question(role: str, topic: str, difficulty: str = "Medium") -> Question:
    """
    Generates a grounded interview question using ChromaDB examples + Gemini.

    Flow:
      1. Call get_smart_grounding() — cascading ChromaDB fallback that handles
         unknown roles, missing topics, and missing difficulty levels.
      2. Build a prompt that includes the examples AND any adaptation notes
         telling Gemini exactly what to adjust.
      3. Try Gemini models in order; retry once per model on transient errors.
      4. Raise GenerationError only if every model/attempt is exhausted.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise GenerationError("GEMINI_API_KEY environment variable is not set.")

    # 1. Smart ChromaDB grounding — always returns something useful
    grounding_examples, adaptation_notes = vector_store.get_smart_grounding(
        role=role, topic=topic, difficulty=difficulty, n_results=3
    )

    examples_context = "\n\n".join(
        f"Example {i + 1}:\n"
        f"  Question: {eg.question_text}\n"
        f"  Answer:   {eg.reference_answer}"
        for i, eg in enumerate(grounding_examples)
    )

    # 2. Build prompt with adaptation instructions baked in
    prompt = _build_prompt(role, topic, difficulty, examples_context, adaptation_notes)

    client = genai.Client(api_key=api_key)
    last_err = None

    # 3. Try each model; one retry per model on transient errors
    for model_name in FALLBACK_MODELS:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.7,
                    ),
                )

                if response.text:
                    raw_text = re.sub(r"^```json\s*|\s*```$", "", response.text.strip())
                    data = json.loads(raw_text)

                    return Question(
                        id=str(uuid.uuid4()),
                        role=data.get("role", role),
                        topic=data.get("topic", topic),
                        difficulty=data.get("difficulty", difficulty),
                        question_text=data["question_text"],
                        reference_answer=data["reference_answer"],
                    )

            except Exception as e:
                last_err = e
                time.sleep(1.5)
                continue

    raise GenerationError(f"All Gemini models failed. Last error: {last_err}")


def generate_followup_question(request: FollowUpRequest) -> Question:
    """
    Generates a follow-up question based on the user's previous answer and missing concepts.
    If the score is low, it asks a foundational question about the missing concepts.
    If the score is high but keywords are missing, it asks an advanced/nuanced question.
    """
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise GenerationError("GEMINI_API_KEY environment variable is not set.")

    # Format missing keywords string
    missing_str = ", ".join(request.score.missing_keywords) if request.score.missing_keywords else "None"
    
    # Determine posture based on the fused score
    fused = request.score.fused_score or 0.0
    if fused < 0.5:
        posture = "The candidate struggled with the original question. Ask a simpler, foundational question focusing heavily on explaining these missing concepts."
    elif fused >= 0.8:
        posture = "The candidate did well but missed some details. Ask a nuanced, advanced question about these missing concepts to test their deep understanding."
    else:
        posture = "The candidate's answer was average. Ask a follow-up question specifically drilling down into these missing concepts."

    prompt = f"""You are an expert technical interviewer following up on a candidate's answer.
Your job is to generate exactly 1 follow-up interview question to probe their weak spots.

CONTEXT:
- Original Question: {request.original_question}
- Candidate's Answer: {request.user_answer}
- Overall Score: {fused * 100:.1f}/100
- Missing Concepts / Keywords: {missing_str}

YOUR INSTRUCTIONS:
1. {posture}
2. The question MUST directly address the missing concepts if they are provided.
3. The reference_answer must be thorough and technically accurate.
4. Do NOT compliment or critique the user in the question text (e.g. no "You missed X, so tell me..."). Just ask the question directly.

Return valid JSON with exactly these keys:
  "role" (string, default to "Follow-up"), 
  "topic" (string, the specific topic of this follow-up), 
  "difficulty" (string, either "Easy", "Medium", "Hard"), 
  "question_text" (string, the actual question), 
  "reference_answer" (string, the correct answer)
"""

    client = genai.Client(api_key=api_key)
    last_err = None

    for model_name in FALLBACK_MODELS:
        for attempt in range(2):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.7,
                    ),
                )

                if response.text:
                    raw_text = re.sub(r"^```json\s*|\s*```$", "", response.text.strip())
                    data = json.loads(raw_text)

                    return Question(
                        id=str(uuid.uuid4()),
                        role=data.get("role", "Follow-up"),
                        topic=data.get("topic", "Follow-up"),
                        difficulty=data.get("difficulty", "Medium"),
                        question_text=data["question_text"],
                        reference_answer=data["reference_answer"],
                    )
            except Exception as e:
                last_err = e
                time.sleep(1.5)
                continue

    raise GenerationError(f"All Gemini models failed for follow-up. Last error: {last_err}")