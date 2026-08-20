"""
Router: /questions
GET /questions/next  — wires Person 1 (ChromaDB) + Person 2 (Gemini) together.
GET /questions       — returns a list of questions (bulk endpoint).
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
import json

from app.schemas.questions import QuestionOut
from app.services.vector_store import vector_store
from app.services.question_generation import generate_question, GenerationError

router = APIRouter()

# Default fallback UUIDs for frontend/database compatibility
_DEFAULT_ROLE_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
_DEFAULT_TOPIC_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")


def _to_uuid(raw_id: str) -> uuid.UUID:
    """Converts a string ID (such as numeric StackOverflow ID or UUID) into a valid UUID object."""
    try:
        return uuid.UUID(str(raw_id))
    except (ValueError, AttributeError):
        # Generate a deterministic UUID5 if the raw ID is numeric (e.g. from SEDE)
        return uuid.uuid5(uuid.NAMESPACE_DNS, str(raw_id))


@router.get("/next", response_model=QuestionOut)
def next_question(
    role: Optional[str] = Query(None, description="Filter by role, e.g. 'Backend Engineer'"),
    topic: Optional[str] = Query(None, description="Filter by topic, e.g. 'Python / Data Structures'"),
    difficulty: Optional[str] = Query(None, description="Preferred difficulty: Easy, Medium, Hard"),
    excluded_ids: Optional[str] = Query(None, description="JSON array of question IDs to exclude (already seen)"),
) -> QuestionOut:
    """
    Returns ONE freshly generated interview question for the given role, topic, and difficulty.

    **How it works (ChromaDB is always consulted first):**

    1. **ChromaDB grounding** — fetches up to 3 real Stack Overflow examples from the
       question bank using a smart cascade:
       - Tries exact `role + topic + difficulty` match first.
       - If not found: drops topic, keeps difficulty.
       - If still not found: tries adjacent difficulty levels (Medium → Easy → Hard).
       - If still not found: falls back to role-only examples.
       Any unknown role (e.g. `ML Engineer`, `iOS Developer`) is automatically mapped
       to the nearest group (`Backend Engineer`, `Frontend Engineer`, etc.).

    2. **Gemini generation** — the retrieved examples + adaptation notes are injected
       into a structured prompt. Gemini generates a *brand-new* question in the same
       style, at the correct difficulty, specifically for the requested role and topic.
       Up to 3 Gemini models are tried with 2 retries each before giving up.

    3. **Emergency fallback** *(only if Gemini API is completely unavailable)* —
       returns an existing ChromaDB question directly. `source` field will be
       `"chromadb"` instead of `"gemini"` so you can tell which path was taken.

    4. **404** — only if both Gemini and ChromaDB return nothing (extremely unlikely).

    **`source` field values:**
    - `"gemini"` → fresh AI-generated question grounded on ChromaDB examples ✅
    - `"chromadb"` → existing question served directly (Gemini API was unavailable)
    """
    role_filter = role or "Backend Engineer"
    topic_filter = topic or "Python / Data Structures"
    difficulty_filter = difficulty or "Medium"
    excluded = set(json.loads(excluded_ids) if excluded_ids else [])

    # --- Attempt 1: Gemini generation (Person 2) ---
    try:
        ai_q = generate_question(
            role=role_filter,
            topic=topic_filter,
            difficulty=difficulty_filter,
        )
        return QuestionOut(
            question_id=_to_uuid(ai_q.id),
            topic_id=_DEFAULT_TOPIC_ID,
            role_id=_DEFAULT_ROLE_ID,
            question_text=ai_q.question_text,
            reference_answer=ai_q.reference_answer,
            difficulty=ai_q.difficulty.lower() if ai_q.difficulty else difficulty_filter.lower(),
            source="gemini",
        )
    except (GenerationError, Exception) as exc:
        import logging
        logging.getLogger(__name__).warning("Gemini failed, falling back. Error: %s", repr(exc))
        pass  # fall through to ChromaDB

    # --- Attempt 2: ChromaDB bank (Person 1) ---
    bank = vector_store.get_random_questions(
        role=role_filter,
        topic=topic_filter,
        count=5,  # fetch more to allow filtering excluded
        excluded_ids=excluded,
    )
    if bank:
        bq = bank[0]
        return QuestionOut(
            question_id=_to_uuid(bq.id),
            topic_id=_DEFAULT_TOPIC_ID,
            role_id=_DEFAULT_ROLE_ID,
            question_text=bq.question_text,
            reference_answer=bq.reference_answer,
            difficulty=bq.difficulty.lower() if bq.difficulty else None,
            source="chromadb",
        )

    raise HTTPException(
        status_code=404,
        detail=f"No questions available for role='{role_filter}' topic='{topic_filter}'.",
    )


@router.get("", response_model=List[QuestionOut])
def get_questions(
    role: Optional[str] = Query(None, description="Filter by role name, e.g. 'Backend Engineer'"),
    topic: Optional[str] = Query(None, description="Filter by topic name, e.g. 'Python / Data Structures'"),
    difficulty: Optional[str] = Query(None, description="Preferred difficulty: Easy, Medium, Hard"),
    count: int = Query(5, ge=1, le=10, description="Number of questions to retrieve (5-10)"),
    excluded_ids: Optional[str] = Query(None, description="JSON array of question IDs to exclude"),
) -> List[QuestionOut]:
    """
    Returns a batch of `count` questions (default 3) for the given role and topic.

    **How it works:**

    - **Slot 1** — Gemini generates a fresh question grounded on ChromaDB examples
      (same ChromaDB-first pipeline as `GET /questions/next`).
    - **Slots 2–N** — filled with random questions pulled directly from ChromaDB.

    Use this endpoint to pre-load a set of questions at the start of a session.
    Use `GET /questions/next` to fetch one question at a time during an active session.
    """
    role_filter = role or "Backend Engineer"
    topic_filter = topic or "Python / Data Structures"
    difficulty_filter = difficulty or "Medium"
    excluded = set(json.loads(excluded_ids) if excluded_ids else [])

    questions_out: List[QuestionOut] = []

    # 1. Attempt fresh Gemini generation for the leading question
    try:
        ai_q = generate_question(role=role_filter, topic=topic_filter, difficulty=difficulty_filter)
        q_id = _to_uuid(ai_q.id)
        if str(q_id) not in excluded:
            questions_out.append(
                QuestionOut(
                    question_id=q_id,
                    topic_id=_DEFAULT_TOPIC_ID,
                    role_id=_DEFAULT_ROLE_ID,
                    question_text=ai_q.question_text,
                    reference_answer=ai_q.reference_answer,
                    difficulty=ai_q.difficulty.lower() if ai_q.difficulty else difficulty_filter.lower(),
                    source="gemini",
                )
            )
    except (GenerationError, Exception) as e:
        # Graceful fallback: log and continue to fill directly from bank
        pass

    # 2. Retrieve remaining questions from ChromaDB Question Bank
    needed = count - len(questions_out)
    if needed > 0:
        already_added = {str(q.question_id) for q in questions_out} | excluded
        bank_questions = vector_store.get_random_questions(
            role=role_filter,
            topic=topic_filter,
            count=needed + 10,  # over-fetch to compensate for filtered-out duplicates
            excluded_ids=already_added,
        )

        for bq in bank_questions:
            if len(questions_out) >= count:
                break
            bq_id = _to_uuid(bq.id)
            if str(bq_id) not in already_added:
                questions_out.append(
                    QuestionOut(
                        question_id=bq_id,
                        topic_id=_DEFAULT_TOPIC_ID,
                        role_id=_DEFAULT_ROLE_ID,
                        question_text=bq.question_text,
                        reference_answer=bq.reference_answer,
                        difficulty=bq.difficulty.lower() if bq.difficulty else difficulty_filter.lower(),
                        source="chromadb",
                    )
                )
                already_added.add(str(bq_id))

    return questions_out