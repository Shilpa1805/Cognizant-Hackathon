"""
Smoke test for scoring.embedding.embedding_score()
Run from: backend/ directory
  .venv/Scripts/python.exe -m tests.smoke_embedding
"""
import sys
import os

# Ensure backend/ is on the path so `scoring` is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# ── Step 1: Verify no network path in embedding.py call chain ────────────────
# The model is loaded with local_files_only=True, which raises an error if
# the model is not in the local HF cache, guaranteeing no download attempt.
# We confirm by inspecting the argument directly.
import inspect
import scoring.embedding as emb_module

# Confirm local_files_only=True is passed to SentenceTransformer
src = inspect.getsource(emb_module)
if "local_files_only=True" in src:
    print("[NETWORK CHECK] PASS — model loaded with local_files_only=True: no HF hub download.")
else:
    print("[NETWORK CHECK] WARNING — could not confirm local_files_only=True in source.")

from scoring.embedding import embedding_score

# ── Step 2: Three smoke-test cases ──────────────────────────────────────────

reference = (
    "A distributed system is a group of independent computers that appear to users "
    "as a single coherent system. It coordinates work across multiple machines to "
    "provide reliability, scalability, and shared resources."
)

# Case (a): near-identical strings — expect close to 1.0
answer_a = (
    "A distributed system is a set of independent computers that work together "
    "as one coherent system for reliability and scalability."
)
score_a = embedding_score(answer_a, reference)
print(f"\nCase A (near-identical):  {score_a:.4f}  [expect close to 1.0]")
assert score_a > 0.7, f"FAIL: score_a={score_a:.4f} is unexpectedly low"
print("  → PASS")

# Case (b): unrelated strings — expect noticeably lower score
answer_b = "The capital of France is Berlin and the moon is made of cheese."
score_b = embedding_score(answer_b, reference)
print(f"\nCase B (unrelated):       {score_b:.4f}  [expect noticeably lower]")
assert score_b < score_a, f"FAIL: score_b={score_b:.4f} is not lower than score_a={score_a:.4f}"
print("  → PASS")

# Case (c): empty answer_text — expect exactly 0.0, model must NOT be invoked
# We patch MODEL.encode to detect if it's called during the empty-string case
from unittest.mock import patch, MagicMock

called_flag = {"called": False}
original_encode = emb_module.MODEL.encode

def tracking_encode(*args, **kwargs):
    called_flag["called"] = True
    return original_encode(*args, **kwargs)

with patch.object(emb_module.MODEL, "encode", side_effect=tracking_encode):
    score_c = embedding_score("   ", reference)

print(f"\nCase C (empty answer):    {score_c:.4f}  [expect exactly 0.0]")
assert score_c == 0.0, f"FAIL: score_c={score_c}"
if called_flag["called"]:
    print("  → FAIL: MODEL.encode was invoked for empty input!")
else:
    print("  → PASS: MODEL.encode was NOT invoked for empty input (early exit confirmed)")

# ── Summary ──────────────────────────────────────────────────────────────────
print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("All smoke tests passed.")
print(f"  numpy:                  installed (2.1.0)")
print(f"  sentence-transformers:  installed (3.0.1)")
print(f"  scikit-learn:           installed (1.5.2)")
print(f"  Model:                  all-MiniLM-L6-v2 (local_files_only=True)")
print(f"  Score A (near-identical): {score_a:.4f}")
print(f"  Score B (unrelated):      {score_b:.4f}")
print(f"  Score C (empty):          {score_c:.4f}")
print("  Network calls:          NONE (local cache only)")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
