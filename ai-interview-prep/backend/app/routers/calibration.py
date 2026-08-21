"""
Calibration Router — Pod 2
==========================
Exposes GET /calibration to run the benchmark evaluation against the
stratified Mohler dataset + behavioral calibration sample and return
Pearson/Spearman correlation statistics and top disagreements.
"""

from typing import Dict, Any
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.services.calibration import run_calibration_check, get_cached_coefficients

router = APIRouter()


@router.get("/coefficients")
def get_coefficients() -> JSONResponse:
    """
    Fast endpoint — returns linear regression coefficients from in-memory cache.
    Returns {ready: false} with HTTP 202 while the cache is still warming
    (pre-warm starts at server startup in a background thread).
    """
    coeffs = get_cached_coefficients()
    if coeffs is None:
        return JSONResponse(status_code=202, content={"ready": False})
    return JSONResponse(content={"ready": True, **coeffs})


@router.get("", response_model=Dict[str, Any])
@router.get("/", response_model=Dict[str, Any])
def get_calibration_results() -> Dict[str, Any]:
    """
    Runs the automated calibration benchmark check and returns correlation
    metrics (Pearson r, Spearman rho), top disagreements, and itemized results.
    Result is cached after first run — subsequent calls return instantly.
    """
    return run_calibration_check()
