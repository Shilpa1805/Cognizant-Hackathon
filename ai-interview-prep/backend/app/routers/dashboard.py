"""
Router: GET /dashboard/summary, GET /dashboard/{user_id}, GET /study-plan/{user_id}
Provides topic-wise progress aggregation, priority rankings, and custom study plans.
"""

import uuid
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.answer import Answer as AnswerModel
from app.models.progress import StudyPlan as StudyPlanModel
from app.models.progress import TopicProgress as TopicProgressModel
from app.models.question import Question as QuestionModel
from app.models.role_topic import Topic as TopicModel
from app.models.score import Score as ScoreModel
from app.models.session import MockSession as MockSessionModel
from app.schemas.dashboard import (
    DashboardSessionHistoryOut,
    DashboardStudyPlanItemOut,
    DashboardSummaryOut,
    DashboardTopicAverageOut,
    StudyPlanOut,
    TopicProgressOut,
)

router = APIRouter()

DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _build_recommended_focus(avg_score: float, question_frequency: int) -> str:
    if avg_score < 40.0:
        return (
            f"High priority: rebuild fundamentals and do intensive drills "
            f"(avg {avg_score:.2f}%, {question_frequency} questions in bank)."
        )
    if avg_score < 70.0:
        return (
            f"Medium priority: strengthen weak patterns and practice mixed difficulty "
            f"(avg {avg_score:.2f}%, {question_frequency} questions in bank)."
        )
    return (
        f"Maintenance priority: keep this topic warm with spaced revision "
        f"(avg {avg_score:.2f}%, {question_frequency} questions in bank)."
    )


@router.get("/dashboard/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(
    user_id: uuid.UUID, 
    db: Session = Depends(get_db)
) -> DashboardSummaryOut:
    """
    Pod 3 core endpoint for PrepIQ dashboard.
    Computes topic averages from Score rows for the specified user.
    """
    score_value = func.coalesce(ScoreModel.human_calibrated_score, ScoreModel.fused_score)

    topic_frequency_subquery = (
        db.query(
            QuestionModel.topic_id.label("topic_id"),
            func.count(QuestionModel.question_id).label("question_frequency"),
        )
        .group_by(QuestionModel.topic_id)
        .subquery()
    )

    topic_rows = (
        db.query(
            TopicModel.topic_id.label("topic_id"),
            TopicModel.topic_name.label("topic_name"),
            (func.avg(score_value) * 100.0).label("avg_score"),
            topic_frequency_subquery.c.question_frequency.label("question_frequency"),
        )
        .join(QuestionModel, QuestionModel.topic_id == TopicModel.topic_id)
        .join(AnswerModel, AnswerModel.question_id == QuestionModel.question_id)
        .join(ScoreModel, ScoreModel.answer_id == AnswerModel.answer_id)
        .join(topic_frequency_subquery, topic_frequency_subquery.c.topic_id == TopicModel.topic_id)
        .filter(
            AnswerModel.user_id == user_id,
            score_value.isnot(None),
        )
        .group_by(
            TopicModel.topic_id,
            TopicModel.topic_name,
            topic_frequency_subquery.c.question_frequency,
        )
        .all()
    )

    ordered_topics = sorted(
        topic_rows,
        key=lambda row: (float(row.avg_score), -int(row.question_frequency), row.topic_name),
    )

    topic_average_scores = []
    study_plan = []

    for rank, row in enumerate(ordered_topics, start=1):
        # Fetch up to 5 most recent scored answers for this topic
        recent = (
            db.query(ScoreModel.fused_score, AnswerModel.submitted_at, ScoreModel.missing_keywords, AnswerModel.session_id, AnswerModel.answer_id)
            .join(AnswerModel, ScoreModel.answer_id == AnswerModel.answer_id)
            .join(QuestionModel, AnswerModel.question_id == QuestionModel.question_id)
            .filter(
                QuestionModel.topic_id == row.topic_id,
                AnswerModel.user_id == user_id,
                ScoreModel.fused_score.isnot(None),
            )
            .order_by(AnswerModel.submitted_at.desc())
            .limit(5)
            .all()
        )

        recent_topic_scores = [round(float(s[0]), 2) for s in reversed(recent)] if recent else []
        last_attempted = recent[0][1] if recent else None
        recent_missed_concepts = recent[0][2] if recent and recent[0][2] else []
        recent_session_id = recent[0][3] if recent else None
        recent_answer_id = recent[0][4] if recent else None

        topic_average_scores.append(
            DashboardTopicAverageOut(
                topic_id=row.topic_id,
                topic_name=row.topic_name,
                avg_score=round(float(row.avg_score), 2),
                question_frequency=int(row.question_frequency),
                last_attempted=last_attempted,
                recent_missed_concepts=recent_missed_concepts,
                recent_topic_scores=recent_topic_scores,
                recent_session_id=recent_session_id,
                recent_answer_id=recent_answer_id,
            )
        )

        study_plan.append(
            DashboardStudyPlanItemOut(
                topic_id=row.topic_id,
                topic_name=row.topic_name,
                priority_rank=rank,
                recommended_focus=_build_recommended_focus(
                    avg_score=round(float(row.avg_score), 2),
                    question_frequency=int(row.question_frequency),
                ),
                avg_score=round(float(row.avg_score), 2),
                question_frequency=int(row.question_frequency),
                last_attempted=last_attempted,
                recent_missed_concepts=recent_missed_concepts,
                recent_topic_scores=recent_topic_scores,
                recent_session_id=recent_session_id,
                recent_answer_id=recent_answer_id,
            )
        )

    session_rows = (
        db.query(
            MockSessionModel.session_id.label("session_id"),
            MockSessionModel.started_at.label("started_at"),
            MockSessionModel.ended_at.label("ended_at"),
            (func.avg(score_value) * 100.0).label("overall_session_score"),
        )
        .outerjoin(
            AnswerModel,
            and_(
                AnswerModel.session_id == MockSessionModel.session_id,
                AnswerModel.user_id == user_id,
            ),
        )
        .outerjoin(ScoreModel, ScoreModel.answer_id == AnswerModel.answer_id)
        .filter(MockSessionModel.user_id == user_id)
        .group_by(
            MockSessionModel.session_id,
            MockSessionModel.started_at,
            MockSessionModel.ended_at,
        )
        .order_by(MockSessionModel.started_at.desc())
        .all()
    )

    session_history = [
        DashboardSessionHistoryOut(
            session_id=row.session_id,
            started_at=row.started_at,
            ended_at=row.ended_at,
            overall_session_score=(
                round(float(row.overall_session_score), 2)
                if row.overall_session_score is not None
                else None
            ),
        )
        for row in session_rows
    ]

    return DashboardSummaryOut(
        user_id=user_id,
        topic_average_scores=topic_average_scores,
        study_plan=study_plan,
        session_history=session_history,
    )


@router.get("/dashboard/{user_id}", response_model=List[TopicProgressOut])
def get_dashboard(user_id: uuid.UUID, db: Session = Depends(get_db)) -> List[TopicProgressOut]:
    """Query topic_progress table for given user."""
    records = db.query(TopicProgressModel).filter(TopicProgressModel.user_id == user_id).all()
    if records:
        return records

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
    persisted_plan = db.query(StudyPlanModel).filter(StudyPlanModel.user_id == user_id).all()
    if persisted_plan:
        return persisted_plan

    summary = get_dashboard_summary(user_id=user_id, db=db)

    return [
        StudyPlanOut(
            id=uuid.uuid4(),
            user_id=user_id,
            topic_id=item.topic_id,
            priority_rank=item.priority_rank,
            recommended_resources=[item.recommended_focus],
            generated_at=datetime.utcnow(),
        )
        for item in summary.study_plan
    ]
