"""Scoring service for PrepIQ.

This module is the merge-safe integration layer between the local embedding
signal and the concept-overlap signal. It keeps the internal implementation of
those modules isolated while exposing a stable service API for the rest of the
backend.
"""

from __future__ import annotations

import json
import os
from typing import Any, Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.answer import Answer
from app.models.score import Score
from scoring.embedding import embedding_score
from scoring.concept_overlap import concept_overlap


router = APIRouter()


class SubmitAnswerRequest(BaseModel):
    session_id: UUID
    question_id: UUID
    user_id: UUID
    answer_text: str
    question_text: str
    reference_answer: str


def _clip(value: float | None, low: float = 0.0, high: float = 1.0) -> float:
    if value is None:
        return 0.0
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(low, min(high, numeric))


def _extract_concept_score(concept_result: Any) -> float:
    if concept_result is None:
        return 0.0
    if isinstance(concept_result, dict):
        for key in ("score", "concept_match_score", "concept_score"):
            if key in concept_result:
                return _clip(concept_result[key])
        return 0.0
    if isinstance(concept_result, (tuple, list)) and concept_result:
        return _clip(concept_result[0])
    try:
        return _clip(float(concept_result))
    except (TypeError, ValueError):
        return 0.0


def _extract_missing_keywords(concept_result: Any) -> list[str]:
    if concept_result is None:
        return []
    if isinstance(concept_result, dict):
        for key in ("missing_keywords", "missing_concepts", "missing"):
            value = concept_result.get(key)
            if value is not None:
                return [str(item) for item in value][:5]
    if isinstance(concept_result, (tuple, list)) and len(concept_result) >= 3:
        value = concept_result[2]
        if isinstance(value, (list, tuple, set)):
            return [str(item) for item in value][:5]
    elif isinstance(concept_result, (tuple, list)) and len(concept_result) >= 2:
        value = concept_result[1]
        if isinstance(value, (list, tuple, set)):
            return [str(item) for item in value][:5]
    return []


def _extract_matched_keywords(concept_result: Any) -> list[str]:
    if concept_result is None:
        return []
    if isinstance(concept_result, dict):
        for key in ("matched_keywords", "matched_concepts", "matched"):
            value = concept_result.get(key)
            if value is not None:
                return [str(item) for item in value][:5]
    if isinstance(concept_result, (tuple, list)) and len(concept_result) >= 2:
        value = concept_result[1]
        if isinstance(value, (list, tuple, set)):
            return [str(item) for item in value][:5]
    return []


def llm_judge(question_text: str, answer_text: str, reference_answer: str) -> tuple[float | None, str]:
    """Ask Gemini to score the answer and return (score, reasoning)."""
    if answer_text is None or not str(answer_text).strip():
        return 0.0, "empty answer"

    prompt_lines = [
        "You are a strict grading assistant.",
        "Score the student's answer against the reference answer on correctness, clarity, and structure combined.",
        "Respond with strict JSON only, no markdown fences, no commentary.",
        "",
        f"Question: {question_text}",
        "",
        f"Reference answer: {reference_answer}",
        "",
        f"Student answer: {answer_text}",
        "",
        "Return exactly this schema: {\"score\": float, \"reasoning\": string}.",
        "The score must be between 0.0 and 1.0.",
    ]
    prompt = "\n".join(prompt_lines)

    try:
        from google import generativeai as genai
    except ImportError:
        return None, "google-generativeai is not installed"

    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None, "GEMINI_API_KEY is not configured"

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        raw_text = getattr(response, "text", None)

        if raw_text is None and hasattr(response, "candidates"):
            candidate = response.candidates[0]
            content = getattr(candidate, "content", None)
            if content is not None and hasattr(content, "parts"):
                raw_text = "".join(getattr(part, "text", "") for part in content.parts)

        if not raw_text:
            return None, "Gemini returned an empty response"

        cleaned = str(raw_text).strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:].strip()

        payload = json.loads(cleaned)
        if not isinstance(payload, dict):
            return None, "Gemini response was not JSON object"

        score = float(payload.get("score", 0.0))
        reasoning = str(payload.get("reasoning") or "No reasoning provided.")
        return _clip(score), reasoning
    except Exception as exc:  # pragma: no cover - graceful failure is required
        return None, f"LLM judge failed: {exc}"


def fuse_scores(embed_score: float | None, concept_score: float | None, judge_score: float | None) -> float:
    """Weighted combination using 0.35 embedding, 0.25 concept, 0.40 judge."""
    embed_value = _clip(embed_score)
    concept_value = _clip(concept_score)

    if judge_score is None:
        total_other = 0.35 + 0.25
        if total_other <= 0:
            return _clip((embed_value + concept_value) / 2.0)
        return _clip((embed_value * (0.35 / total_other)) + (concept_value * (0.25 / total_other)))

    judge_value = _clip(judge_score)
    fused = (0.35 * embed_value) + (0.25 * concept_value) + (0.40 * judge_value)
    return _clip(fused)


def build_feedback_text(concept_result: Any, judge_reasoning: str | None) -> str:
    """Create plain-language feedback using top missing concepts and the judge reasoning."""
    missing_keywords = _extract_missing_keywords(concept_result)
    if missing_keywords:
        opening = "You may want to strengthen your response with: " + ", ".join(missing_keywords[:5]) + "."
    else:
        opening = "You covered the key ideas well."

    reason_text = str(judge_reasoning or "The answer is broadly coherent but could be more precise.")
    reason_text = reason_text.strip()
    if not reason_text.endswith((".", "!", "?")):
        reason_text += "."

    return f"{opening} {reason_text}"


def run_calibration(labeled_samples: Sequence[dict[str, Any]]) -> dict[str, Any]:
    """Return Pearson and Spearman correlations for a hand-labeled calibration set."""
    from scipy.stats import pearsonr, spearmanr

    if not labeled_samples:
        return {"pearson_r": None, "spearman_rho": None, "sample_count": 0}

    human_scores: list[float] = []
    fused_scores: list[float] = []

    for sample in labeled_samples:
        answer_text = str(sample.get("answer_text", ""))
        reference_answer = str(sample.get("reference_answer", ""))
        question_text = str(sample.get("question_text", ""))
        human_score = float(sample.get("human_score", 0.0))

        embed_score = embedding_score(answer_text, reference_answer)
        try:
            concept_result = concept_overlap(answer_text, reference_answer)
        except Exception:
            concept_result = {"score": 0.0, "missing_keywords": []}
        concept_score = _extract_concept_score(concept_result)
        judge_score, _ = llm_judge(question_text, answer_text, reference_answer)
        fused_score = fuse_scores(embed_score, concept_score, judge_score)

        human_scores.append(human_score)
        fused_scores.append(fused_score)

    pearson_value = pearsonr(human_scores, fused_scores)[0]
    spearman_value = spearmanr(human_scores, fused_scores).correlation

    return {
        "pearson_r": None if pearson_value is None or str(pearson_value) == "nan" else float(pearson_value),
        "spearman_rho": None if spearman_value is None or str(spearman_value) == "nan" else float(spearman_value),
        "sample_count": len(labeled_samples),
    }


@router.post("/answers/submit")
def submit_answer(payload: SubmitAnswerRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Submit an answer, score it, and persist the result to the database."""
    if payload.answer_text is None or not str(payload.answer_text).strip():
        raise HTTPException(status_code=400, detail="answer_text is required")

    embed_score_value = embedding_score(payload.answer_text, payload.reference_answer)

    try:
        concept_result = concept_overlap(payload.answer_text, payload.reference_answer)
    except Exception as exc:  # pragma: no cover - degrade gracefully
        concept_result = {"score": 0.0, "missing_keywords": [], "error": str(exc)}

    concept_score_value = _extract_concept_score(concept_result)
    judge_score, judge_reasoning = llm_judge(
        payload.question_text,
        payload.answer_text,
        payload.reference_answer,
    )
    fused_score_value = fuse_scores(embed_score_value, concept_score_value, judge_score)
    feedback_text = build_feedback_text(concept_result, judge_reasoning)
    missing_keywords = _extract_missing_keywords(concept_result)
    matched_keywords = _extract_matched_keywords(concept_result)

    answer_row = Answer(
        session_id=payload.session_id,
        question_id=payload.question_id,
        user_id=payload.user_id,
        answer_text=payload.answer_text,
    )
    db.add(answer_row)
    db.flush()

    score_row = Score(
        answer_id=answer_row.answer_id,
        similarity_score=embed_score_value,
        llm_judge_score=judge_score,
        concept_match_score=concept_score_value,
        fused_score=fused_score_value,
        feedback_text=feedback_text,
        missing_keywords=missing_keywords,
        answer_explanation=judge_reasoning,
        connecting_keywords=matched_keywords,
        tips_and_tricks=[],
    )
    db.add(score_row)
    db.commit()
    db.refresh(answer_row)
    db.refresh(score_row)

    return {
        "score_id": score_row.score_id,
        "answer_id": answer_row.answer_id,
        "similarity_score": embed_score_value,
        "llm_judge_score": judge_score,
        "concept_match_score": concept_score_value,
        "fused_score": fused_score_value,
        "feedback_text": feedback_text,
        "missing_keywords": missing_keywords,
    }
