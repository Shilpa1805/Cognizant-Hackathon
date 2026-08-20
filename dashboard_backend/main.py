from typing import List, Optional
from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from .database import get_db, engine, Base
from .models import Session as InterviewSession, Question, Answer, Score
from .schemas import DashboardSummaryResponse, TopicScore, StudyPlanItem, SessionHistoryItem
from .analytics import (
    get_user_topic_aggregations,
    get_topic_frequencies_in_question_bank,
    calculate_priority_ranking
)

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Interview Prep - Dashboard Pod Backend",
    description="FastAPI backend providing analytical aggregations, priority rankings, and session histories.",
    version="1.0.0"
)

# Enable CORS for frontend flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "AI Interview Prep Companion - Dashboard Backend API is running.",
        "docs_url": "http://localhost:8000/docs",
        "summary_endpoint": "http://localhost:8000/dashboard/summary?user_id=user_101"
    }


@app.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    user_id: str = Query(default="user_101", description="Candidate User ID"),
    db: Session = Depends(get_db)
):
    """
    Returns aggregated topic scores, prioritized study plan, and session history
    for a given candidate user_id according to the shared JSON contract.
    """
    # 1. Topic-wise aggregations
    topic_scores_data = get_user_topic_aggregations(db, user_id)

    # 2. Topic frequencies in Question Bank for priority formula weighting
    topic_frequencies = get_topic_frequencies_in_question_bank(db)

    # 3. Pure Priority Ranking
    study_plan_data = calculate_priority_ranking(topic_scores_data, topic_frequencies)

    # 4. Session History
    sessions = (
        db.query(InterviewSession)
        .options(
            joinedload(InterviewSession.question),
            joinedload(InterviewSession.answers).joinedload(Answer.scores)
        )
        .filter(InterviewSession.user_id == user_id)
        .order_by(InterviewSession.timestamp.asc())
        .all()
    )

    session_history = []
    for s in sessions:
        # Get associated score
        score_val = 0.0
        feedback_text = None
        missing_kw_list = []

        if s.answers:
            ans = s.answers[0]
            feedback_text = ans.feedback_text
            if ans.missing_keywords:
                missing_kw_list = [k.strip() for k in ans.missing_keywords.split(",") if k.strip() and k.strip().lower() != "none"]
            if ans.scores:
                score_val = ans.scores[0].fused_score

        session_history.append(
            SessionHistoryItem(
                session_id=s.id,
                topic=s.question.topic if s.question else "General",
                question_text=s.question.text if s.question else "",
                score=round(score_val, 4),
                timestamp=s.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                feedback_text=feedback_text,
                missing_keywords=missing_kw_list
            )
        )

    return DashboardSummaryResponse(
        topic_scores=[TopicScore(**item) for item in topic_scores_data],
        study_plan=[StudyPlanItem(**item) for item in study_plan_data],
        session_history=session_history
    )


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "dashboard_backend"}
