"""
Unit Tests — Pod 2 Data & Scoring (3-signal scoring pipeline & submit endpoint)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.scoring import compute_similarity, concept_match, llm_judge, score_answer

client = TestClient(app)


def test_compute_similarity_offline():
    text_a = "Floyd's fast and slow pointers algorithm detects cycle in linked list."
    text_b = "Use fast and slow pointers to detect a cycle in a linked list."
    sim = compute_similarity(text_a, text_b)
    assert 0.0 <= sim <= 1.0
    assert sim > 0.50


def test_concept_match_missing_keywords():
    ref = "SQL databases support ACID transactions and vertical scaling."
    ans = "SQL is structured and relational."
    score, matched, missing = concept_match(ans, ref)
    assert 0.0 <= score <= 1.0
    assert isinstance(matched, list)
    assert isinstance(missing, list)


def test_score_answer_fusion():
    res = score_answer(
        answer_text="Use fast and slow pointers.",
        reference_answer="Use Floyd's Cycle-Finding Algorithm (Fast and Slow Pointers).",
        question_text="How do you detect a cycle in a singly linked list?"
    )
    assert "similarity_score" in res
    assert "concept_match_score" in res
    assert "llm_judge_score" in res
    assert "fused_score" in res
    assert "feedback_text" in res
    assert "missing_keywords" in res
    assert 0.0 <= res["fused_score"] <= 1.0


def test_answers_submit_endpoint():
    payload = {
        "question_id": "11111111-1111-1111-1111-000000000101",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "answer_text": "Use fast and slow pointers to detect cycles."
    }
    response = client.post("/answers/submit", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "score_id" in data
    assert "answer_id" in data
    assert "fused_score" in data
    assert "feedback_text" in data
    assert "missing_keywords" in data
