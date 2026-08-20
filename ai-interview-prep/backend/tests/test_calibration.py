"""
Unit & Integration Tests — Pod 2 Calibration Check (Pearson/Spearman correlation verification)
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.calibration import run_calibration_check


client = TestClient(app)


def test_calibration_metrics():
    metrics = run_calibration_check()
    assert metrics["sample_count"] >= 30
    assert "pearson_r" in metrics
    assert "spearman_rho" in metrics
    assert "top_disagreements" in metrics
    assert len(metrics["top_disagreements"]) <= 5
    for item in metrics["top_disagreements"]:
        assert "source" in item
        assert item["source"] in ["mohler", "handwritten"]
    assert -1.0 <= metrics["pearson_r"] <= 1.0
    assert -1.0 <= metrics["spearman_rho"] <= 1.0
    # Model should correlate positively with human scores
    assert metrics["pearson_r"] >= 0.50
    assert metrics["spearman_rho"] >= 0.50


def test_calibration_endpoint():
    response = client.get("/calibration")
    assert response.status_code == 200
    data = response.json()
    assert data["sample_count"] >= 30
    assert "pearson_r" in data
    assert "spearman_rho" in data
    assert "top_disagreements" in data
