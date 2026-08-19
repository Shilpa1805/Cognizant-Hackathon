"""
Unit Tests — Pod 1 AI Pipeline (/questions/next, fallback, follow-up)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_questions_list():
    response = client.get("/questions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "question_text" in data[0]


def test_questions_next_endpoint():
    response = client.get("/questions/next")
    assert response.status_code == 200
    data = response.json()
    assert "question_id" in data
    assert "question_text" in data
    assert "topic_id" in data
    assert "role_id" in data
    assert len(data["question_text"]) > 5


def test_questions_followup_endpoint():
    payload = {
        "answer_text": "I used a simple loop.",
        "original_question_text": "How do you detect a cycle in a linked list?",
        "missing_keywords": ["fast and slow pointers", "O(1) space complexity"],
        "role_id": "11111111-1111-1111-1111-000000000001",
        "topic_id": "22222222-2222-2222-2222-000000000001"
    }
    response = client.post("/questions/followup", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "question_text" in data
    assert "question_id" in data
