"""
Unit Tests — Pod 3 Auth & Dashboard (/auth/signup, /auth/login, /dashboard/summary)
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_auth_signup_and_login():
    unique_email = f"test_{uuid.uuid4().hex[:8]}@mace.ac.in"
    signup_payload = {
        "name": "Test Student",
        "email": unique_email,
        "password": "password123",
        "role": "candidate"
    }
    
    # 1. Signup
    res_signup = client.post("/auth/signup", json=signup_payload)
    assert res_signup.status_code == 201
    data_signup = res_signup.json()
    assert "access_token" in data_signup
    assert data_signup["user"]["email"] == unique_email

    # 2. Login
    login_payload = {
        "email": unique_email,
        "password": "password123"
    }
    res_login = client.post("/auth/login", json=login_payload)
    assert res_login.status_code == 200
    data_login = res_login.json()
    assert "access_token" in data_login
    assert data_login["user"]["email"] == unique_email


def test_dashboard_summary_endpoint():
    res = client.get("/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "overall_avg_score" in data
    assert "topic_summaries" in data
    assert "study_plan" in data
    assert len(data["topic_summaries"]) > 0
    assert "priority_rank" in data["topic_summaries"][0]
