"""
Database Seed Script — PrepIQ
Loads seed_data.json into the SQL database tables (job_roles, topics, questions, users, topic_progress)
and populates the ChromaDB vector store.
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal, Base
import app.models  # Ensure all models are registered
from app.models.role_topic import JobRole, Topic
from app.models.question import Question
from app.models.user import User
from app.models.progress import TopicProgress
from app.services.vector_store import ingest_questions

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def parse_uuid(val: str | int) -> uuid.UUID:
    """Helper to convert int/string IDs to deterministically formatted UUIDs."""
    if isinstance(val, uuid.UUID):
        return val
    try:
        return uuid.UUID(str(val))
    except (ValueError, AttributeError):
        # Convert integer seed IDs like 1 or 101 to standard UUIDs
        return uuid.UUID(f"00000000-0000-0000-0000-{int(val):012d}")


def seed_database(db: Session) -> None:
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    seed_file = Path(__file__).parent.parent / "data" / "seed_data.json"
    if not seed_file.exists():
        print(f"Seed file not found at {seed_file}")
        return

    with open(seed_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    print("Seeding database tables...")

    # 1. Job Roles
    role_map = {}
    for r in data.get("job_roles", []):
        r_id = parse_uuid(r["role_id"])
        role_map[r["role_id"]] = r_id
        existing = db.query(JobRole).filter(JobRole.role_id == r_id).first()
        if not existing:
            job_role = JobRole(
                role_id=r_id,
                role_name=r["role_name"],
                description=r.get("description"),
            )
            db.add(job_role)
    db.commit()

    # 2. Topics
    topic_map = {}
    for t in data.get("topics", []):
        t_id = parse_uuid(t["topic_id"])
        topic_map[t["topic_id"]] = t_id
        existing = db.query(Topic).filter(Topic.topic_id == t_id).first()
        if not existing:
            parent_role_id = role_map.get(t["role_id"], parse_uuid(t["role_id"]))
            topic = Topic(
                topic_id=t_id,
                role_id=parent_role_id,
                topic_name=t["topic_name"],
                category=t.get("category"),
            )
            db.add(topic)
    db.commit()

    # 3. Questions & Vector Store Payload
    questions_to_ingest = []
    for q in data.get("questions", []):
        q_id = parse_uuid(q["question_id"])
        parent_role_id = role_map.get(q["role_id"], parse_uuid(q["role_id"]))
        parent_topic_id = topic_map.get(q["topic_id"], parse_uuid(q["topic_id"]))

        existing = db.query(Question).filter(Question.question_id == q_id).first()
        if not existing:
            question = Question(
                question_id=q_id,
                role_id=parent_role_id,
                topic_id=parent_topic_id,
                question_text=q["question_text"],
                reference_answer=q.get("reference_answer"),
                difficulty=q.get("difficulty", "medium"),
                source=q.get("source", "seed"),
            )
            db.add(question)
        
        questions_to_ingest.append({
            "question_id": str(q_id),
            "role_id": str(parent_role_id),
            "topic_id": str(parent_topic_id),
            "question_text": q["question_text"],
            "reference_answer": q.get("reference_answer", ""),
            "difficulty": q.get("difficulty", "medium"),
            "source": q.get("source", "seed"),
        })
    db.commit()

    # 4. Users
    user_map = {}
    for u in data.get("users", []):
        raw_uid = u["user_id"]
        try:
            u_id = uuid.UUID(raw_uid)
        except ValueError:
            u_id = uuid.uuid5(uuid.NAMESPACE_DNS, raw_uid)
        user_map[raw_uid] = u_id

        existing = db.query(User).filter(User.email == u["email"]).first()
        if not existing:
            hashed_pwd = pwd_context.hash("password123")
            user = User(
                user_id=u_id,
                name=u["name"],
                email=u["email"],
                password_hash=hashed_pwd,
                role=u.get("role", "student"),
            )
            db.add(user)
    db.commit()

    # 5. Topic Progress
    for tp in data.get("topic_progress", []):
        raw_uid = tp["user_id"]
        u_id = user_map.get(raw_uid, parse_uuid(raw_uid) if str(raw_uid).isdigit() else uuid.uuid5(uuid.NAMESPACE_DNS, raw_uid))
        t_id = topic_map.get(tp["topic_id"], parse_uuid(tp["topic_id"]))

        existing = db.query(TopicProgress).filter(
            TopicProgress.user_id == u_id,
            TopicProgress.topic_id == t_id
        ).first()

        if not existing:
            progress = TopicProgress(
                user_id=u_id,
                topic_id=t_id,
                avg_score=tp.get("avg_score", 0.0),
                attempts_count=tp.get("attempts_count", 0),
                last_updated=datetime.utcnow(),
            )
            db.add(progress)
    db.commit()

    # 6. Ingest into ChromaDB Vector Store
    if questions_to_ingest:
        print(f"Ingesting {len(questions_to_ingest)} seed questions into ChromaDB...")
        try:
            ingest_questions(questions_to_ingest)
        except Exception as e:
            print(f"Warning: Vector store ingestion failed: {e}")

    print("Seeding completed successfully!")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
