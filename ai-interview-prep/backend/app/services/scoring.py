"""
Scoring Service — STUB
========================
TODO(ML-scoring pair): Implement multi-signal scoring pipeline.

Planned implementation:
  1. similarity_score  — cosine similarity between answer and reference embeddings.
  2. llm_judge_score   — prompt an LLM to rate the answer 0-1 against the rubric.
  3. concept_match_score — extract key concepts from reference; check coverage in answer.
  4. fused_score       — weighted average of the three signals above.
  5. missing_keywords  — concepts present in reference but absent from answer.

This module is intentionally empty. Add your implementations below.
"""

from typing import Optional
from .concept_overlap import concept_overlap

def score_answer(
    answer_text: str,
    reference_answer: str,
    question_text: str,
) -> dict:
    """
    TODO(ML-scoring pair): Run the full multi-signal scoring pipeline.

    Args:
        answer_text: The candidate's raw answer.
        reference_answer: The gold-standard reference answer from the DB.
        question_text: The question being answered (used by LLM judge for context).

    Returns:
        A dict with keys: similarity_score, llm_judge_score, concept_match_score,
        fused_score, feedback_text, missing_keywords (list[str]).
    """
    concept_result = concept_overlap(
        answer_text,
        reference_answer
)

    concept_match_score = concept_result["score"]
    missing_concepts = concept_result["missing_concepts"]
    raise NotImplementedError("scoring.score_answer is not yet implemented.")


def compute_similarity(text_a: str, text_b: str) -> float:
    """
    TODO(ML-scoring pair): Embed both texts and return cosine similarity in [0, 1].
    """
    raise NotImplementedError("scoring.compute_similarity is not yet implemented.")


def llm_judge(answer_text: str, reference_answer: str, question_text: str) -> float:
    """
    TODO(ML-scoring pair): Call an LLM to rate answer quality in [0, 1].
    """
    raise NotImplementedError("scoring.llm_judge is not yet implemented.")


def concept_match(answer_text: str, reference_answer: str) -> tuple[float, list]:
    """
    TODO(ML-scoring pair): Extract key concepts from reference and compute coverage.

    Returns:
        Tuple of (concept_match_score, missing_keywords_list).
    """
    raise NotImplementedError("scoring.concept_match is not yet implemented.")
