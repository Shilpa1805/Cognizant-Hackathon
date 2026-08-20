"""Offline embedding-based fallback scoring signal for interview answers."""

from __future__ import annotations

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


MODEL = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)


def embedding_score(answer_text: str, reference_answer: str) -> float:
    """Return a cosine-similarity score in the range [0.0, 1.0].

    This is a pure offline fallback scoring signal used when the LLM judge is
    unavailable. It must never depend on external network or API services.
    """
    if answer_text is None or not str(answer_text).strip():
        return 0.0

    if reference_answer is None or not str(reference_answer).strip():
        return 0.0

    answer_embedding = MODEL.encode(
        str(answer_text),
        convert_to_numpy=True,
        normalize_embeddings=False,
    )
    reference_embedding = MODEL.encode(
        str(reference_answer),
        convert_to_numpy=True,
        normalize_embeddings=False,
    )

    similarity = cosine_similarity(
        answer_embedding.reshape(1, -1),
        reference_embedding.reshape(1, -1),
    )[0, 0]

    return float(np.clip(similarity, 0.0, 1.0))


if __name__ == "__main__":
    reference = (
        "A distributed system is a group of independent computers that appear to users "
        "as a single coherent system. It coordinates work across multiple machines to "
        "provide reliability, scalability, and shared resources."
    )

    test_cases = [
        (
            "A distributed system is a set of independent computers that work together as one coherent system for reliability and scalability.",
            reference,
        ),
        (
            "The capital of France is Berlin and the moon is made of cheese.",
            reference,
        ),
        (
            "   ",
            reference,
        ),
    ]

    for index, (answer, ref) in enumerate(test_cases, start=1):
        print(f"Case {index}: {embedding_score(answer, ref):.4f}")
