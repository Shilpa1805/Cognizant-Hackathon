from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import Score, Question


def calculate_priority_ranking(
    topic_scores: List[Dict[str, Any]],
    topic_frequencies: Dict[str, int]
) -> List[Dict[str, Any]]:
    """
    Pure function to calculate priority ranking for study topics.
    Formula: priority_score = (1 - avg_score) * topic_frequency_in_question_bank
    Higher priority_score = higher priority = rank 1.
    """
    ranked_topics = []

    for item in topic_scores:
        topic = item["topic"]
        avg_score = item["avg_score"]
        frequency = topic_frequencies.get(topic, 1)
        
        priority_score = round((1.0 - avg_score) * frequency, 4)
        ranked_topics.append({
            "topic": topic,
            "priority_score": priority_score,
            "avg_score": round(avg_score, 4)
        })

    # Sort descending by priority_score; resolve ties alphabetically by topic name
    ranked_topics.sort(key=lambda x: (-x["priority_score"], x["topic"]))

    # Assign 1-indexed priority_rank
    study_plan = []
    for rank, item in enumerate(ranked_topics, start=1):
        study_plan.append({
            "topic": item["topic"],
            "priority_rank": rank,
            "priority_score": item["priority_score"],
            "avg_score": item["avg_score"]
        })

    return study_plan


def get_user_topic_aggregations(db: Session, user_id: str) -> List[Dict[str, Any]]:
    """
    Query DB scores for a given user_id, group by topic,
    and compute avg_score and num_attempts per topic.
    """
    results = (
        db.query(
            Score.topic,
            func.avg(Score.fused_score).label("avg_score"),
            func.count(Score.id).label("num_attempts")
        )
        .filter(Score.user_id == user_id)
        .group_by(Score.topic)
        .all()
    )

    topic_scores = []
    for row in results:
        topic_scores.append({
            "topic": row.topic,
            "avg_score": round(float(row.avg_score), 4),
            "num_attempts": int(row.num_attempts)
        })

    return topic_scores


def get_topic_frequencies_in_question_bank(db: Session) -> Dict[str, int]:
    """
    Count the number of questions per topic in the question bank.
    """
    counts = (
        db.query(
            Question.topic,
            func.count(Question.id)
        )
        .group_by(Question.topic)
        .all()
    )
    return {topic: int(count) for topic, count in counts}

