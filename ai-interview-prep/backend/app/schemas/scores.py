"""
Pydantic schemas for /scores endpoint.
"""

from uuid import UUID
from typing import List, Optional

from pydantic import BaseModel, computed_field


class ScoreHint(BaseModel):
    connecting_keywords: Optional[List[str]] = None
    tips_and_tricks: Optional[List[str]] = None


class ScoreOut(BaseModel):
    score_id: UUID
    answer_id: UUID
    similarity_score: Optional[float] = None
    llm_judge_score: Optional[float] = None
    concept_match_score: Optional[float] = None
    fused_score: Optional[float] = None
    human_calibrated_score: Optional[float] = None
    feedback_text: Optional[str] = None
    missing_keywords: Optional[List[str]] = None

    reference_answer: Optional[str] = None
    answer_explanation: Optional[str] = None
    hint: Optional[ScoreHint] = None

    @computed_field
    @property
    def similarity_percentage(self) -> Optional[int]:
        return round(self.similarity_score * 100) if self.similarity_score is not None else None

    model_config = {"from_attributes": True}
