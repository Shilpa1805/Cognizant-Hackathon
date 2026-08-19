"""
Unit Tests — Pod 2 Calibration Check (Pearson/Spearman correlation verification)
"""

import pytest
from app.services.calibration import run_calibration_check


def test_calibration_metrics():
    metrics = run_calibration_check()
    assert metrics["sample_count"] > 0
    assert "pearson_r" in metrics
    assert "spearman_rho" in metrics
    assert -1.0 <= metrics["pearson_r"] <= 1.0
    assert -1.0 <= metrics["spearman_rho"] <= 1.0
    # Model should correlate positively with human scores
    assert metrics["pearson_r"] >= 0.50
    assert metrics["spearman_rho"] >= 0.50
