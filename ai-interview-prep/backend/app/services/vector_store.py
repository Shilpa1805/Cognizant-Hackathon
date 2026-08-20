import random
import logging
from pathlib import Path
from typing import List, Optional, Tuple

import chromadb

from app.schemas import Question

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ChromaDB path
# ---------------------------------------------------------------------------
CHROMA_DB_PATH = Path(__file__).resolve().parent.parent.parent / "chroma_db"


# ---------------------------------------------------------------------------
# Role mapping — maps any job title → nearest ChromaDB group
# Keys are lowercase-stripped. Anything not found defaults to DEFAULT_GROUP.
# ---------------------------------------------------------------------------
ROLE_MAP: dict[str, str] = {
    # ── Exact existing groups (pass-through) ────────────────────────────────
    "backend engineer":          "Backend Engineer",
    "frontend engineer":         "Frontend Engineer",
    "devops engineer":           "DevOps Engineer",
    "software engineer":         "Software Engineer",
    # ── ML / AI / Data ───────────────────────────────────────────────────────
    "ml engineer":               "Backend Engineer",
    "machine learning engineer": "Backend Engineer",
    "ai engineer":               "Backend Engineer",
    "data scientist":            "Backend Engineer",
    "data engineer":             "Backend Engineer",
    "data analyst":              "Backend Engineer",
    "nlp engineer":              "Backend Engineer",
    "computer vision engineer":  "Backend Engineer",
    # ── Full-stack ────────────────────────────────────────────────────────────
    "full stack engineer":       "Backend Engineer",
    "fullstack engineer":        "Backend Engineer",
    "full stack developer":      "Backend Engineer",
    # ── Mobile ───────────────────────────────────────────────────────────────
    "ios developer":             "Frontend Engineer",
    "ios engineer":              "Frontend Engineer",
    "android developer":         "Frontend Engineer",
    "android engineer":          "Frontend Engineer",
    "mobile developer":          "Frontend Engineer",
    "mobile engineer":           "Frontend Engineer",
    "react native developer":    "Frontend Engineer",
    "flutter developer":         "Frontend Engineer",
    # ── Infra / Cloud / SRE ──────────────────────────────────────────────────
    "cloud engineer":            "DevOps Engineer",
    "sre":                       "DevOps Engineer",
    "site reliability engineer": "DevOps Engineer",
    "platform engineer":         "DevOps Engineer",
    "infrastructure engineer":   "DevOps Engineer",
    "security engineer":         "DevOps Engineer",
    "cybersecurity engineer":    "DevOps Engineer",
    "network engineer":          "DevOps Engineer",
    # ── Product / Management ─────────────────────────────────────────────────
    "product manager":           "Software Engineer",
    "product engineer":          "Software Engineer",
    "technical program manager": "Software Engineer",
    "engineering manager":       "Software Engineer",
    # ── QA / Test ────────────────────────────────────────────────────────────
    "qa engineer":               "Software Engineer",
    "test engineer":             "Software Engineer",
    "sdet":                      "Software Engineer",
    # ── Embedded / Systems ───────────────────────────────────────────────────
    "embedded engineer":         "Backend Engineer",
    "systems engineer":          "Backend Engineer",
    "firmware engineer":         "Backend Engineer",
}

DEFAULT_GROUP = "Software Engineer"

# Ordered fallback chain for difficulty: preferred → adjacent → opposite
DIFFICULTY_FALLBACK: dict[str, list[str]] = {
    "Easy":   ["Easy",   "Medium", "Hard"],
    "Medium": ["Medium", "Easy",   "Hard"],
    "Hard":   ["Hard",   "Medium", "Easy"],
}


class VectorStoreService:
    def __init__(self, db_path: Path = CHROMA_DB_PATH):
        self.client = chromadb.PersistentClient(path=str(db_path))
        self.collection = self.client.get_or_create_collection(
            name="question_bank",
            metadata={"hnsw:space": "cosine"}
        )

    # ── Internal fetch helper ────────────────────────────────────────────────
    def _fetch(
        self,
        role: Optional[str] = None,
        topic: Optional[str] = None,
        difficulty: Optional[str] = None,
        n: int = 3,
    ) -> List[Question]:
        """
        Builds a ChromaDB where-filter from any combination of fields and
        returns up to n Question objects. Returns [] on no match or error.
        """
        conditions = []
        if role:
            conditions.append({"role": role})
        if topic:
            conditions.append({"topic": topic})
        if difficulty:
            conditions.append({"difficulty": difficulty})

        if not conditions:
            where = None
        elif len(conditions) == 1:
            where = conditions[0]
        else:
            where = {"$and": conditions}

        try:
            results = (
                self.collection.get(where=where, limit=n)
                if where
                else self.collection.get(limit=n)
            )
        except Exception:
            return []

        if not results["ids"]:
            return []

        questions = []
        for i in range(len(results["ids"])):
            q_id = results["ids"][i]
            ref_ans = results["metadatas"][i].get("reference_answer", "")
            if not ref_ans:
                logger.warning("ChromaDB question id=%s is missing reference_answer in metadata.", q_id)
            questions.append(
                Question(
                    id=q_id,
                    role=results["metadatas"][i]["role"],
                    topic=results["metadatas"][i]["topic"],
                    difficulty=results["metadatas"][i]["difficulty"],
                    question_text=results["documents"][i],
                    reference_answer=ref_ans,
                )
            )
        return questions

    # ── Smart grounding (topic-centric cascade) ─────────────────────────────
    def get_smart_grounding(
        self,
        role: str,
        topic: str,
        difficulty: str,
        n_results: int = 3,
    ) -> Tuple[List[Question], str]:
        """
        Returns (examples, adaptation_notes) using a 3-step topic-centric cascade.

        Step 1 — topic + difficulty (exact match)
                  → found: use as-is, no adaptation notes needed.

        Step 2 — topic only (any difficulty)
                  → found: tell Gemini the examples are the right topic but
                    wrong difficulty, and to adjust to the requested level.

        Step 3 — nothing found for this topic at all
                  → return empty examples + instruct Gemini to generate
                    entirely from scratch.
        """
        # Step 1: Exact match — topic + difficulty
        examples = self._fetch(topic=topic, difficulty=difficulty, n=n_results)
        if examples:
            return examples, ""

        # Step 2: Topic found, but wrong difficulty
        examples = self._fetch(topic=topic, n=n_results)
        if examples:
            notes = (
                f"The examples below are for the topic '{topic}' but at a different difficulty level. "
                f"Use them only as style and content anchors. "
                f"Generate the question at '{difficulty}' difficulty."
            )
            return examples, notes

        # Step 3: Topic not found at all — generate from scratch
        return [], (
            f"No examples found in the question bank for topic '{topic}'. "
            f"Generate a brand-new '{difficulty}' interview question about '{topic}' "
            f"for a {role} from scratch, without any grounding examples."
        )

    # ── Legacy methods (kept for backward compatibility) ─────────────────────
    def get_question(self, role: str, topic: Optional[str] = None, limit: int = 5) -> List[Question]:
        """
        Retrieves questions filtered by role and topic.
        Returns a list of schemas.Question objects.
        """
        mapped_role = ROLE_MAP.get(role.strip().lower(), DEFAULT_GROUP)
        examples = self._fetch(role=mapped_role, topic=topic, n=limit)
        if not examples and topic:
            examples = self._fetch(role=mapped_role, n=limit)
        if not examples:
            raise ValueError(f"No questions found for role='{role}' (mapped='{mapped_role}').")
        return examples

    def get_grounding_examples(self, role: str, topic: str, n_results: int = 3) -> List[Question]:
        """Legacy grounding fetch — now respects ROLE_MAP."""
        mapped_role = ROLE_MAP.get(role.strip().lower(), DEFAULT_GROUP)
        examples = self._fetch(role=mapped_role, topic=topic, n=n_results)
        if not examples:
            examples = self._fetch(role=mapped_role, n=n_results)
        return examples

    def get_random_questions(
        self, role: str, topic: Optional[str] = None, count: int = 1,
        excluded_ids: Optional[set] = None,
        difficulty: Optional[str] = None,
    ) -> List[Question]:
        """
        Retrieves `count` random questions from ChromaDB using a 3-step
        topic-centric cascade that mirrors get_smart_grounding:

          1. topic + difficulty  → exact match
          2. topic only          → any difficulty (Gemini adjusts to requested level)
          3. topic not found     → return empty; Gemini generates from scratch
        """
        n_fetch = max(50, count * 3)
        excluded = excluded_ids or set()

        pool: List[Question] = []
        seen_ids: set = set()

        def _add(candidates: List[Question]) -> None:
            for q in candidates:
                qid = str(q.id)
                if qid not in excluded and qid not in seen_ids:
                    pool.append(q)
                    seen_ids.add(qid)

        # Step 1: Exact match — topic + difficulty
        if topic and difficulty:
            _add(self._fetch(topic=topic, difficulty=difficulty, n=n_fetch))

        if len(pool) >= count:
            random.shuffle(pool)
            return pool[:count]

        # Step 2: Topic found, any difficulty
        if topic:
            _add(self._fetch(topic=topic, n=n_fetch))

        if len(pool) >= count:
            random.shuffle(pool)
            return pool[:count]

        # Step 3: Topic not in bank — return empty; Gemini will generate from scratch
        random.shuffle(pool)
        return pool[:count]


# ---------------------------------------------------------------------------
# Singleton instance
# ---------------------------------------------------------------------------
vector_store = VectorStoreService()


def get_question(role: str, topic: Optional[str] = None) -> Question:
    """Standard Pod 1 function interface."""
    return vector_store.get_question(role, topic)


def ingest_questions(questions: list[dict]) -> None:
    """
    Ingests a list of question dicts into the ChromaDB vector store.

    Each dict must contain:
        question_id   (str UUID)
        question_text (str)
        role_id       (str UUID) — used as metadata "role"
        topic_id      (str UUID) — used as metadata "topic"
        difficulty    (str)
        reference_answer (str, optional)
        source        (str, optional)

    Skips questions already present (upsert-safe via ChromaDB add).
    """
    if not questions:
        return

    # Map role_id / topic_id → human-readable labels using a best-effort lookup.
    # The ChromaDB where-filter queries use role_name/topic_name strings,
    # so we store the display names (not UUIDs) in metadata.
    ROLE_ID_TO_NAME: dict[str, str] = {
        "00000000-0000-0000-0000-000000000001": "Backend Engineer",
        "00000000-0000-0000-0000-000000000002": "Frontend Engineer",
        "00000000-0000-0000-0000-000000000003": "DevOps Engineer",
        "00000000-0000-0000-0000-000000000004": "Software Engineer",
    }
    TOPIC_ID_TO_NAME: dict[str, str] = {
        "00000000-0000-0000-0000-000000000001": "Python / Data Structures",
        "00000000-0000-0000-0000-000000000002": "Operating Systems",
        "00000000-0000-0000-0000-000000000003": "System Design",
        "00000000-0000-0000-0000-000000000004": "Databases",
        "00000000-0000-0000-0000-000000000005": "Algorithms",
        "00000000-0000-0000-0000-000000000006": "Behavioural & Communication",
        "11111111-1111-1111-1111-111111111111": "Python / Data Structures",
        "22222222-2222-2222-2222-222222222222": "Operating Systems",
        "33333333-3333-3333-3333-333333333333": "System Design",
        "44444444-4444-4444-4444-444444444444": "Databases",
        "55555555-5555-5555-5555-555555555555": "Algorithms",
        "66666666-6666-6666-6666-666666666666": "Behavioural & Communication",
    }

    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict] = []

    for q in questions:
        q_id = q.get("question_id", "")
        text = q.get("question_text", "").strip()
        if not q_id or not text:
            continue

        role_raw = q.get("role_id", "")
        topic_raw = q.get("topic_id", "")

        role_name = ROLE_ID_TO_NAME.get(role_raw, role_raw)
        topic_name = TOPIC_ID_TO_NAME.get(topic_raw, topic_raw)

        ids.append(q_id)
        documents.append(text)
        metadatas.append({
            "role":             role_name,
            "topic":            topic_name,
            "difficulty":       q.get("difficulty", "Medium"),
            "reference_answer": q.get("reference_answer", ""),
            "source":           q.get("source", "seed"),
        })

    if not ids:
        return

    try:
        # upsert — safe to call multiple times (idempotent)
        vector_store.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )
        print(f"[vector_store] Ingested {len(ids)} questions into ChromaDB.")
    except Exception as exc:
        print(f"[vector_store] ChromaDB upsert failed: {exc}")