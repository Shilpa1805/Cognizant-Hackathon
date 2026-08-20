import uuid
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.answer import Answer
from app.models.question import Question
from app.models.role_topic import JobRole, Topic
from app.models.score import Score
from app.models.session import MockSession
from app.models.user import User
from app.routers import dashboard


def test_dashboard_summary_aggregates_scores_and_prioritizes_topics():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    app = FastAPI()
    app.include_router(dashboard.router)

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    demo_user_id = dashboard.DEFAULT_USER_ID
    other_user_id = uuid.uuid4()
    role_id = uuid.uuid4()
    topic_db_id = uuid.uuid4()
    topic_system_id = uuid.uuid4()
    topic_python_id = uuid.uuid4()

    db.add_all(
        [
            User(
                user_id=demo_user_id,
                name="Demo User",
                email="demo@example.com",
                password_hash="x",
                role="candidate",
            ),
            User(
                user_id=other_user_id,
                name="Other User",
                email="other@example.com",
                password_hash="y",
                role="candidate",
            ),
            JobRole(role_id=role_id, role_name="Backend Engineer", description="Role"),
            Topic(topic_id=topic_db_id, role_id=role_id, topic_name="Databases", category="Technical"),
            Topic(topic_id=topic_system_id, role_id=role_id, topic_name="System Design", category="Technical"),
            Topic(topic_id=topic_python_id, role_id=role_id, topic_name="Python Core", category="Technical"),
        ]
    )

    question_db = [Question(question_id=uuid.uuid4(), topic_id=topic_db_id, role_id=role_id, question_text="DB?", reference_answer="A", difficulty="easy", source="seed")]
    question_system = [
        Question(question_id=uuid.uuid4(), topic_id=topic_system_id, role_id=role_id, question_text=f"SD{i}?", reference_answer="A", difficulty="medium", source="seed")
        for i in range(4)
    ]
    question_python = [
        Question(question_id=uuid.uuid4(), topic_id=topic_python_id, role_id=role_id, question_text=f"PY{i}?", reference_answer="A", difficulty="medium", source="seed")
        for i in range(2)
    ]
    db.add_all(question_db + question_system + question_python)

    session_old_id = uuid.uuid4()
    session_new_id = uuid.uuid4()
    session_old = MockSession(
        session_id=session_old_id,
        user_id=demo_user_id,
        role_id=role_id,
        started_at=datetime.utcnow() - timedelta(days=2),
        ended_at=(datetime.utcnow() - timedelta(days=2)) + timedelta(hours=1),
        status="completed",
    )
    session_new = MockSession(
        session_id=session_new_id,
        user_id=demo_user_id,
        role_id=role_id,
        started_at=datetime.utcnow() - timedelta(days=1),
        ended_at=(datetime.utcnow() - timedelta(days=1)) + timedelta(hours=1),
        status="completed",
    )
    db.add_all([session_old, session_new])
    db.flush()

    answer_db = Answer(
        answer_id=uuid.uuid4(),
        session_id=session_old.session_id,
        question_id=question_db[0].question_id,
        user_id=demo_user_id,
        answer_text="db answer",
    )
    answer_python_a = Answer(
        answer_id=uuid.uuid4(),
        session_id=session_old.session_id,
        question_id=question_python[0].question_id,
        user_id=demo_user_id,
        answer_text="python answer A",
    )
    answer_python_b = Answer(
        answer_id=uuid.uuid4(),
        session_id=session_new.session_id,
        question_id=question_python[1].question_id,
        user_id=demo_user_id,
        answer_text="python answer B",
    )
    answer_system = Answer(
        answer_id=uuid.uuid4(),
        session_id=session_new.session_id,
        question_id=question_system[0].question_id,
        user_id=demo_user_id,
        answer_text="system answer",
    )
    other_user_answer = Answer(
        answer_id=uuid.uuid4(),
        session_id=session_new.session_id,
        question_id=question_system[1].question_id,
        user_id=other_user_id,
        answer_text="ignored",
    )
    db.add_all([answer_db, answer_python_a, answer_python_b, answer_system, other_user_answer])
    db.flush()

    db.add_all(
        [
            Score(score_id=uuid.uuid4(), answer_id=answer_db.answer_id, fused_score=0.30),
            Score(score_id=uuid.uuid4(), answer_id=answer_python_a.answer_id, fused_score=0.40),
            Score(score_id=uuid.uuid4(), answer_id=answer_python_b.answer_id, fused_score=0.60),
            Score(score_id=uuid.uuid4(), answer_id=answer_system.answer_id, fused_score=0.50),
            Score(score_id=uuid.uuid4(), answer_id=other_user_answer.answer_id, fused_score=0.05),
        ]
    )
    db.commit()

    response = client.get("/dashboard/summary")
    assert response.status_code == 200
    payload = response.json()

    assert payload["user_id"] == str(demo_user_id)

    topic_names_in_rank_order = [item["topic_name"] for item in payload["study_plan"]]
    assert topic_names_in_rank_order == ["Databases", "System Design", "Python Core"]
    assert [item["priority_rank"] for item in payload["study_plan"]] == [1, 2, 3]

    averages = {item["topic_name"]: item["avg_score"] for item in payload["topic_average_scores"]}
    assert averages["Databases"] == 30.0
    assert averages["System Design"] == 50.0
    assert averages["Python Core"] == 50.0

    frequencies = {item["topic_name"]: item["question_frequency"] for item in payload["topic_average_scores"]}
    assert frequencies["System Design"] == 4
    assert frequencies["Python Core"] == 2

    assert len(payload["session_history"]) == 2
    assert payload["session_history"][0]["session_id"] == str(session_new_id)
    assert payload["session_history"][0]["overall_session_score"] == 55.0
    assert payload["session_history"][1]["session_id"] == str(session_old_id)
    assert payload["session_history"][1]["overall_session_score"] == 35.0

    db.close()
    app.dependency_overrides.clear()
