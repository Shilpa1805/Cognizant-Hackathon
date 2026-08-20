import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from .database import Base, get_db
from .models import Question, Session as InterviewSession, Answer, Score
from .analytics import calculate_priority_ranking, get_user_topic_aggregations, get_topic_frequencies_in_question_bank
from .main import app


# -------------------------------------------------------------
# 1. Pure Unit Tests for Priority Ranking Formula
# -------------------------------------------------------------
def test_priority_ranking_pure_logic():
    """
    Test priority_score = (1 - avg_score) * topic_frequency_in_question_bank
    Higher score = Rank 1
    """
    topic_scores = [
        {"topic": "System Design", "avg_score": 0.60},     # (1 - 0.60) * 5 = 2.00
        {"topic": "Algorithms", "avg_score": 0.40},        # (1 - 0.40) * 2 = 1.20
        {"topic": "Behavioral", "avg_score": 0.90},        # (1 - 0.90) * 10 = 1.00
        {"topic": "Concurrency", "avg_score": 0.20},       # (1 - 0.20) * 1 = 0.80
        {"topic": "Database", "avg_score": 1.00},          # (1 - 1.00) * 10 = 0.00
    ]

    topic_frequencies = {
        "System Design": 5,
        "Algorithms": 2,
        "Behavioral": 10,
        "Concurrency": 1,
        "Database": 10
    }

    result = calculate_priority_ranking(topic_scores, topic_frequencies)

    assert len(result) == 5

    # Check rank order: System Design (2.0) -> Algorithms (1.2) -> Behavioral (1.0) -> Concurrency (0.8) -> Database (0.0)
    assert result[0]["topic"] == "System Design"
    assert result[0]["priority_rank"] == 1
    assert result[0]["priority_score"] == 2.0
    assert result[0]["avg_score"] == 0.60

    assert result[1]["topic"] == "Algorithms"
    assert result[1]["priority_rank"] == 2
    assert result[1]["priority_score"] == 1.2

    assert result[2]["topic"] == "Behavioral"
    assert result[2]["priority_rank"] == 3
    assert result[2]["priority_score"] == 1.0

    assert result[3]["topic"] == "Concurrency"
    assert result[3]["priority_rank"] == 4
    assert result[3]["priority_score"] == 0.8

    assert result[4]["topic"] == "Database"
    assert result[4]["priority_rank"] == 5
    assert result[4]["priority_score"] == 0.0


def test_priority_ranking_tie_breaking():
    """
    Test deterministic alphabetical tie breaking when priority scores are identical.
    """
    topic_scores = [
        {"topic": "Web Security", "avg_score": 0.50},  # (1 - 0.5) * 2 = 1.0
        {"topic": "Cloud Architecture", "avg_score": 0.50},  # (1 - 0.5) * 2 = 1.0
    ]
    frequencies = {"Web Security": 2, "Cloud Architecture": 2}

    result = calculate_priority_ranking(topic_scores, frequencies)
    assert result[0]["topic"] == "Cloud Architecture"
    assert result[0]["priority_rank"] == 1
    assert result[1]["topic"] == "Web Security"
    assert result[1]["priority_rank"] == 2


from sqlalchemy.pool import StaticPool

# -------------------------------------------------------------
# 2. Database Aggregation & Integration Tests (Isolated SQLite)
# -------------------------------------------------------------
@pytest.fixture
def test_db_session():
    """Creates a temporary in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    try:
        # Seed known test fixtures
        # Questions: 3 System Design, 1 Algorithms
        q1 = Question(topic="System Design", text="Q1", difficulty="Easy")
        q2 = Question(topic="System Design", text="Q2", difficulty="Medium")
        q3 = Question(topic="System Design", text="Q3", difficulty="Hard")
        q4 = Question(topic="Algorithms", text="Q4", difficulty="Easy")
        db.add_all([q1, q2, q3, q4])
        db.commit()

        # Candidate user_test_1:
        # Attempt 1: System Design, score 0.60
        s1 = InterviewSession(user_id="user_test_1", question_id=q1.id, timestamp=datetime(2026, 8, 1, 12, 0))
        db.add(s1)
        db.flush()
        a1 = Answer(session_id=s1.id, answer_text="Ans 1", feedback_text="Good", missing_keywords="cache")
        db.add(a1)
        db.flush()
        sc1 = Score(answer_id=a1.id, user_id="user_test_1", topic="System Design", fused_score=0.60)
        db.add(sc1)

        # Attempt 2: System Design, score 0.80 -> Expected Avg = 0.70, Count = 2
        s2 = InterviewSession(user_id="user_test_1", question_id=q2.id, timestamp=datetime(2026, 8, 2, 12, 0))
        db.add(s2)
        db.flush()
        a2 = Answer(session_id=s2.id, answer_text="Ans 2", feedback_text="Better", missing_keywords="none")
        db.add(a2)
        db.flush()
        sc2 = Score(answer_id=a2.id, user_id="user_test_1", topic="System Design", fused_score=0.80)
        db.add(sc2)

        # Attempt 3: Algorithms, score 0.50 -> Expected Avg = 0.50, Count = 1
        s3 = InterviewSession(user_id="user_test_1", question_id=q4.id, timestamp=datetime(2026, 8, 3, 12, 0))
        db.add(s3)
        db.flush()
        a3 = Answer(session_id=s3.id, answer_text="Ans 3", feedback_text="Needs work", missing_keywords="recursion, base case")
        db.add(a3)
        db.flush()
        sc3 = Score(answer_id=a3.id, user_id="user_test_1", topic="Algorithms", fused_score=0.50)
        db.add(sc3)

        # Candidate user_test_2: (Separate user to check isolation)
        s4 = InterviewSession(user_id="user_test_2", question_id=q1.id, timestamp=datetime(2026, 8, 1, 14, 0))
        db.add(s4)
        db.flush()
        a4 = Answer(session_id=s4.id, answer_text="Ans 4")
        db.add(a4)
        db.flush()
        sc4 = Score(answer_id=a4.id, user_id="user_test_2", topic="System Design", fused_score=0.95)
        db.add(sc4)

        db.commit()

        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_database_aggregations(test_db_session):
    """
    Test SQL aggregations for user_test_1:
    - System Design: avg = (0.60 + 0.80) / 2 = 0.70, num_attempts = 2
    - Algorithms: avg = 0.50, num_attempts = 1
    """
    topic_scores = get_user_topic_aggregations(test_db_session, user_id="user_test_1")
    topic_map = {item["topic"]: item for item in topic_scores}

    assert "System Design" in topic_map
    assert topic_map["System Design"]["avg_score"] == 0.70
    assert topic_map["System Design"]["num_attempts"] == 2

    assert "Algorithms" in topic_map
    assert topic_map["Algorithms"]["avg_score"] == 0.50
    assert topic_map["Algorithms"]["num_attempts"] == 1

    # Verify user_test_2 isolation
    topic_scores_u2 = get_user_topic_aggregations(test_db_session, user_id="user_test_2")
    assert len(topic_scores_u2) == 1
    assert topic_scores_u2[0]["avg_score"] == 0.95


def test_topic_frequencies_in_question_bank(test_db_session):
    """Verify question bank frequency counts."""
    frequencies = get_topic_frequencies_in_question_bank(test_db_session)
    assert frequencies["System Design"] == 3
    assert frequencies["Algorithms"] == 1


# -------------------------------------------------------------
# 3. FastAPI Endpoint Integration Test
# -------------------------------------------------------------
def test_dashboard_summary_endpoint(test_db_session):
    """
    Test GET /dashboard/summary?user_id=user_test_1 returns exact JSON contract.
    """
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    response = client.get("/dashboard/summary?user_id=user_test_1")
    assert response.status_code == 200

    data = response.json()

    # Assert top-level keys
    assert "topic_scores" in data
    assert "study_plan" in data
    assert "session_history" in data

    # Assert topic_scores shape
    assert len(data["topic_scores"]) == 2
    for item in data["topic_scores"]:
        assert "topic" in item
        assert "avg_score" in item
        assert "num_attempts" in item
        assert isinstance(item["avg_score"], float)
        assert isinstance(item["num_attempts"], int)

    # Assert study_plan shape and calculation
    # System Design: (1 - 0.70) * 3 = 0.90 -> Rank 1
    # Algorithms: (1 - 0.50) * 1 = 0.50 -> Rank 2
    assert len(data["study_plan"]) == 2
    assert data["study_plan"][0]["topic"] == "System Design"
    assert data["study_plan"][0]["priority_rank"] == 1
    assert data["study_plan"][0]["priority_score"] == 0.90

    assert data["study_plan"][1]["topic"] == "Algorithms"
    assert data["study_plan"][1]["priority_rank"] == 2
    assert data["study_plan"][1]["priority_score"] == 0.50

    # Assert session_history shape
    assert len(data["session_history"]) == 3
    s1 = data["session_history"][0]
    assert "session_id" in s1
    assert "topic" in s1
    assert "question_text" in s1
    assert "score" in s1
    assert "timestamp" in s1
    assert s1["score"] == 0.60
    assert s1["feedback_text"] == "Good"
    assert s1["missing_keywords"] == ["cache"]

    app.dependency_overrides.clear()
