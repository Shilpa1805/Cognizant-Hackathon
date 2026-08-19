"""
Router: GET /dashboard/summary, GET /dashboard/{user_id}, GET /study-plan/{user_id}
Provides topic-wise progress aggregation, priority rankings, and custom study plans.
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.progress import TopicProgress as TopicProgressModel, StudyPlan as StudyPlanModel
from app.models.question import Question as QuestionModel
from app.models.role_topic import Topic as TopicModel
from app.models.answer import Answer as AnswerModel
from app.models.score import Score as ScoreModel
from app.schemas.dashboard import TopicProgressOut, StudyPlanOut

router = APIRouter()


class TopicSummaryItem(BaseModel):
    topic_id: uuid.UUID
    topic_name: str
    category: Optional[str] = "Technical"
    avg_score: float
    attempts_count: int
    question_frequency: int
    priority_score: float
    priority_rank: int


class DashboardSummaryResponse(BaseModel):
    user_id: uuid.UUID
    overall_avg_score: float
    total_answers: int
    topic_summaries: List[TopicSummaryItem]
    study_plan: List[Dict[str, Any]]


_DEFAULT_RESOURCES = {
    "Data Structures & Algorithms": [
        "LeetCode Top 100 Liked Questions",
        "NeetCode 150 Roadmap",
        "CLRS Algorithms Handbook"
    ],
    "System Design": [
        "Designing Data-Intensive Applications (Kleppmann)",
        "System Design Primer (GitHub)",
        "ByteByteGo System Design Course"
    ],
    "Behavioral & Communication": [
        "STAR Method Response Guide",
        "Amazon 16 Leadership Principles",
        "Mock Behavioral Interview Exercises"
    ],
    "Databases": [
        "Use The Index, Luke! SQL Tuning",
        "CMU 15-445 Database Systems lectures",
        "PostgreSQL Internals Guide"
    ],
    "Operating Systems": [
        "Operating Systems: Three Easy Pieces (OSTEP)",
        "Linux Kernel Development (Love)",
        "Process vs Thread Synchronization Guide"
    ]
}


@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    user_id: Optional[uuid.UUID] = Query(None, description="User UUID"),
    db: Session = Depends(get_db)
) -> DashboardSummaryResponse:
    """
    Pod 3 Core Endpoint: GET /dashboard/summary
    Aggregates student scores by topic, computes average score per topic,
    calculates priority ranking (topics that are low-scoring and frequent rank #1),
    and returns comprehensive dashboard summary.
    """
    target_user_id = user_id or uuid.UUID("00000000-0000-0000-0000-000000000001")

    # 1. Fetch all topics from DB
    topics = db.query(TopicModel).all()
    if not topics:
        # Fallback topics
        topics = [
            TopicModel(topic_id=uuid.UUID("22222222-2222-2222-2222-000000000001"), topic_name="Data Structures & Algorithms", category="Technical"),
            TopicModel(topic_id=uuid.UUID("22222222-2222-2222-2222-000000000002"), topic_name="System Design", category="Technical"),
            TopicModel(topic_id=uuid.UUID("22222222-2222-2222-2222-000000000003"), topic_name="Behavioral & Communication", category="Behavioral"),
        ]

    # 2. Count question frequency per topic in bank
    freq_query = db.query(QuestionModel.topic_id, func.count(QuestionModel.question_id)).group_by(QuestionModel.topic_id).all()
    freq_map = {t_id: count for t_id, count in freq_query}

    # 3. Fetch user progress records
    progress_records = db.query(TopicProgressModel).filter(TopicProgressModel.user_id == target_user_id).all()
    progress_map = {p.topic_id: p for p in progress_records}

    summaries = []
    total_score_sum = 0.0
    total_answers_count = 0

    for t in topics:
        tp = progress_map.get(t.topic_id)
        avg = tp.avg_score if tp and tp.avg_score is not None else 50.0
        attempts = tp.attempts_count if tp else 0
        freq = freq_map.get(t.topic_id, 3)

        # Priority calculation formula: Priority = (100.0 - avg_score) * (freq + 1)
        priority_val = (100.0 - avg) * (freq + 1)

        summaries.append({
            "topic_id": t.topic_id,
            "topic_name": t.topic_name,
            "category": t.category or "Technical",
            "avg_score": round(avg, 2),
            "attempts_count": attempts,
            "question_frequency": freq,
            "priority_score": round(priority_val, 2),
        })

        total_score_sum += avg
        total_answers_count += attempts

    # Sort topics by priority_score descending (highest priority to study first)
    summaries.sort(key=lambda x: x["priority_score"], reverse=True)

    topic_summary_items = []
    study_plan_items = []

    for rank, item in enumerate(summaries, start=1):
        topic_summary_items.append(TopicSummaryItem(
            topic_id=item["topic_id"],
            topic_name=item["topic_name"],
            category=item["category"],
            avg_score=item["avg_score"],
            attempts_count=item["attempts_count"],
            question_frequency=item["question_frequency"],
            priority_score=item["priority_score"],
            priority_rank=rank,
        ))

        study_plan_items.append({
            "priority_rank": rank,
            "topic_id": str(item["topic_id"]),
            "topic_name": item["topic_name"],
            "avg_score": item["avg_score"],
            "reason": f"Rank #{rank}: Low score ({item['avg_score']}%) with high question frequency ({item['question_frequency']} in bank)",
            "recommended_resources": _DEFAULT_RESOURCES.get(item["topic_name"], ["Core documentation and practice questions"]),
        })

    overall_avg = round(total_score_sum / len(topics), 2) if topics else 0.0

    return DashboardSummaryResponse(
        user_id=target_user_id,
        overall_avg_score=overall_avg,
        total_answers=total_answers_count,
        topic_summaries=topic_summary_items,
        study_plan=study_plan_items,
    )


@router.get("/dashboard/{user_id}", response_model=List[TopicProgressOut])
def get_dashboard(user_id: uuid.UUID, db: Session = Depends(get_db)) -> List[TopicProgressOut]:
    """Query topic_progress table for given user."""
    records = db.query(TopicProgressModel).filter(TopicProgressModel.user_id == user_id).all()
    if records:
        return records

    # Fallback response
    topics = db.query(TopicModel).all()
    return [
        TopicProgressOut(
            id=uuid.uuid4(),
            user_id=user_id,
            topic_id=t.topic_id,
            avg_score=65.0,
            attempts_count=2,
            last_updated=datetime.utcnow() - timedelta(days=idx),
        )
        for idx, t in enumerate(topics[:5])
    ]


@router.get("/study-plan/{user_id}", response_model=List[StudyPlanOut])
def get_study_plan(user_id: uuid.UUID, db: Session = Depends(get_db)) -> List[StudyPlanOut]:
    """Query or generate prioritised study plan for user."""
    summary = get_dashboard_summary(user_id=user_id, db=db)
    
    study_plan_rows = []
    for item in summary.study_plan:
        t_id = uuid.UUID(item["topic_id"])
        study_plan_rows.append(StudyPlanOut(
            id=uuid.uuid4(),
            user_id=user_id,
            topic_id=t_id,
            priority_rank=item["priority_rank"],
            recommended_resources=item["recommended_resources"],
            generated_at=datetime.utcnow(),
        ))
    return study_plan_rows

