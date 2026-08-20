"""
Calibration Router — Pod 2
==========================
Exposes GET /calibration to run the benchmark evaluation against the
stratified Mohler dataset + behavioral calibration sample and return
Pearson/Spearman correlation statistics and top disagreements.
"""

from typing import Dict, Any
from fastapi import APIRouter
from app.services.calibration import run_calibration_check

router = APIRouter()


@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
def get_calibration_results() -> Dict[str, Any]:
    """
    Runs the automated calibration benchmark check and returns correlation
    metrics (Pearson r, Spearman rho), top disagreements, and itemized results.
    """
    return run_calibration_check()
