"""
Scoring Service — 3-Signal Hybrid Scoring Engine
=================================================
1. Embedding Similarity Signal: Sentence-transformers (all-MiniLM-L6-v2) or TF-IDF Cosine similarity (100% offline).
2. Concept Match Signal: spaCy / NLP concept extraction to evaluate coverage and missing_keywords.
3. LLM Judge Signal: Gemini LLM rating for correctness, clarity, and structure.
4. Fusion Step: Weighted combination into `fused_score`.
"""

import os
import re
import json
import logging
from typing import List, Tuple, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Signal 1: Sentence Transformers & Scikit-Learn
try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    _st_model = SentenceTransformer("all-MiniLM-L6-v2")
    HAS_SENTENCE_TRANSFORMERS = True
except Exception as e:
    HAS_SENTENCE_TRANSFORMERS = False
    _st_model = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

# Signal 2: spaCy concept extraction
try:
    import spacy
    try:
        _nlp = spacy.load("en_core_web_sm")
    except Exception:
        _nlp = spacy.blank("en")
    HAS_SPACY = True
except ImportError:
    HAS_SPACY = False

# Signal 3: Gemini LLM
try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False


def compute_similarity(text_a: str, text_b: str) -> float:
    """
    Embedding similarity signal — runs 100% offline, zero external API call.
    Uses sentence-transformers if available, with TF-IDF / word overlap fallback.
    Calibrated so unrelated text and non-answers drop cleanly to 0.0.
    """
    if not text_a or not text_b:
        return 0.0

    # Non-answer guard: trivial or evasive answers should have zero similarity
    TRIVIAL_NON_ANSWERS = {
        "idk", "i don't know", "i dont know", "no idea", "dont know", "don't know",
        "pass", "skip", "na", "n/a", "none", "no", "nothing", "not sure", "im not sure",
        "i'm not sure", "huh", "dunno", "idk.", "i don't know.", "i dont know.", "whatever"
    }
    clean_a = text_a.strip().lower().rstrip(".!?,")
    if clean_a in TRIVIAL_NON_ANSWERS or len(clean_a) < 2:
        return 0.0

    if HAS_SENTENCE_TRANSFORMERS and _st_model is not None:
        try:
            emb_a = _st_model.encode(text_a)
            emb_b = _st_model.encode(text_b)
            norm_a = np.linalg.norm(emb_a)
            norm_b = np.linalg.norm(emb_b)
            if norm_a > 0 and norm_b > 0:
                raw_sim = float(np.dot(emb_a, emb_b) / (norm_a * norm_b))
                # Calibrate: raw cosine <= 0.20 indicates noise / no semantic overlap (0.0).
                # Rescale [0.20, 1.00] linearly to [0.0, 1.0].
                calibrated = max(0.0, (raw_sim - 0.20) / 0.80)
                return round(min(1.0, calibrated), 3)
        except Exception as exc:
            print(f"SentenceTransformer similarity error: {exc}. Using TF-IDF fallback.")

    if HAS_SKLEARN:
        try:
            vectorizer = TfidfVectorizer().fit_transform([text_a, text_b])
            vectors = vectorizer.toarray()
            sim = cosine_similarity([vectors[0]], [vectors[1]])[0][0]
            return float(max(0.0, min(1.0, sim)))
        except Exception:
            pass

    # Jaccard word-overlap fallback
    words_a = set(re.findall(r'\w+', text_a.lower()))
    words_b = set(re.findall(r'\w+', text_b.lower()))
    if not words_a or not words_b:
        return 0.0
    intersection = words_a.intersection(words_b)
    union = words_a.union(words_b)
    return float(len(intersection) / len(union))


def concept_match(answer_text: str, reference_answer: str) -> Tuple[float, List[str], List[str]]:
    """
    Concept-overlap signal — extracts key concepts/noun phrases from reference answer
    (via spaCy or regex heuristic) and checks presence in student answer.
    Returns (concept_match_score, matched_keywords, missing_keywords).
    """
    if not reference_answer or not reference_answer.strip():
        return (1.0, [], [])

    # Try spaCy-powered concept_overlap service first
    try:
        from app.services.concept_overlap import concept_overlap, extract_concepts
        res = concept_overlap(answer_text=answer_text, reference_answer=reference_answer)
        score = float(res.get("score", 1.0))
        missing = res.get("missing_concepts", [])
        ref_concepts = extract_concepts(reference_answer)
        matched = sorted([c for c in ref_concepts if c not in missing])
        return (round(score, 3), matched, missing)
    except Exception:
        pass

    concepts = []
    if HAS_SPACY and _nlp:
        try:
            doc = _nlp(reference_answer)
            if doc.has_annotation("DEP"):
                for chunk in doc.noun_chunks:
                    cleaned = chunk.text.strip().lower()
                    if len(cleaned) > 3 and cleaned not in concepts:
                        concepts.append(cleaned)
        except Exception:
            pass

    if not concepts:
        # Regex fallback for technical terms / key words
        words = re.findall(r'\b[A-Za-z\-]{4,}\b', reference_answer)
        stopwords = {"with", "from", "that", "this", "have", "which", "their", "there", "were", "what", "when", "where", "also", "using"}
        concepts = list(set([w.lower() for w in words if w.lower() not in stopwords]))[:10]

    if not concepts:
        return (1.0, [], [])

    ans_lower = answer_text.lower()
    matched = []
    missing = []

    for c in concepts:
        # Check direct or partial match
        if c in ans_lower or any(part in ans_lower for part in c.split() if len(part) > 3):
            matched.append(c)
        else:
            missing.append(c)

    score = float(len(matched) / len(concepts)) if concepts else 1.0
    return (round(score, 3), matched, missing)


def llm_judge(answer_text: str, reference_answer: str, question_text: str) -> Tuple[float, str, str, List[str], List[str]]:
    """
    LLM-judge signal — prompts Gemini LLM to rate correctness, clarity, and structure (0.0-1.0)
    and return constructive feedback, answer explanation, tips/tricks, and missing concepts.
    Returns (score, feedback, answer_explanation, tips_and_tricks, missing_concepts).
    """
    try:
        from app.config import settings
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    except Exception:
        api_key = os.environ.get("GEMINI_API_KEY")
    if HAS_GENAI and api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = (
                f"Question: '{question_text}'\n"
                f"Gold Reference Answer: '{reference_answer}'\n"
                f"Candidate's Submitted Answer: '{answer_text}'\n\n"
                f"Evaluate the candidate's answer for technical accuracy, completeness, and clarity.\n"
                f"Respond ONLY with a JSON object containing:\n"
                f"- 'score': float between 0.0 and 1.0\n"
                f"- 'feedback': 2-3 sentences of constructive feedback.\n"
                f"- 'answer_explanation': a 2-4 sentence plain-English breakdown of why the reference answer is correct/what it covers\n"
                f"- 'tips_and_tricks': JSON array of 1-3 short actionable tips for answering this type of question well\n"
                f"- 'missing_concepts': JSON array of 1-3 short keywords (e.g. 'load balancing', 'cache') that the candidate missed from the reference answer. If none, return empty array."
            )

            response = None
            for model_name in ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"]:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt
                    )
                    if response and response.text:
                        break
                except Exception:
                    continue

            if response and response.text:
                cleaned = response.text.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                elif cleaned.startswith("```"):
                    cleaned = cleaned.split("```")[1].split("```")[0].strip()

                data = json.loads(cleaned)
                score = float(data.get("score", 0.70))
                feedback = str(data.get("feedback", "Good effort! Your response addresses the question."))
                answer_explanation = str(data.get("answer_explanation", ""))
                tips_raw = data.get("tips_and_tricks", [])
                tips_and_tricks = [str(t) for t in tips_raw] if isinstance(tips_raw, list) else []
                missing_raw = data.get("missing_concepts", [])
                missing_concepts = [str(m) for m in missing_raw] if isinstance(missing_raw, list) else []
                return (max(0.0, min(1.0, score)), feedback, answer_explanation, tips_and_tricks, missing_concepts)
        except Exception as exc:
            logger.warning(
                "LLM Judge Gemini call failed (%s: %s). Falling back to heuristic.",
                type(exc).__name__, exc,
                exc_info=True,
            )

    # ---------------------------------------------------------------------------
    # Fallback heuristic — continuous score based on word count + lexical overlap
    # against reference_answer (or question_text when reference is missing).
    # This replaces the 3-bucket approach that collapsed 30% of fused_score.
    # ---------------------------------------------------------------------------
    compare_text = reference_answer if reference_answer else question_text
    words_answer = re.findall(r'\w+', answer_text.lower())
    words_ref    = set(re.findall(r'\w+', compare_text.lower())) if compare_text else set()
    word_count   = len(words_answer)

    # Word-count component: asymptotically approaches 1.0; saturates ~80 words
    length_score = min(1.0, word_count / 80.0)

    # Lexical-overlap component: fraction of reference words present in answer
    if words_ref:
        overlap = len(set(words_answer) & words_ref) / len(words_ref)
    else:
        overlap = length_score  # no reference — fall back to length only

    # Combine: 40% length + 60% overlap, clamp to [0.1, 0.95]
    raw_score = (0.40 * length_score) + (0.60 * overlap)
    score     = round(max(0.10, min(0.95, raw_score)), 3)

    if score >= 0.75:
        feedback = "Strong, detailed answer covering the key concepts well."
    elif score >= 0.50:
        feedback = "Solid attempt. Expand on technical depth, trade-offs, and examples."
    elif score >= 0.25:
        feedback = "Partial answer. Review the reference solution and cover more key points."
    else:
        feedback = "Very brief or off-topic. Provide a detailed technical explanation."

    answer_explanation = ""
    tips_and_tricks    = []
    missing_concepts   = []
    return (score, feedback, answer_explanation, tips_and_tricks, missing_concepts)


def score_answer(
    answer_text: str,
    reference_answer: str,
    question_text: str,
) -> Dict[str, Any]:
    """
    Full 3-signal scoring pipeline + fusion step.
    Combines similarity_score, concept_match_score, and llm_judge_score into fused_score.
    Returns dict matching Score ORM model fields.
    """
    # Warn when reference_answer is missing — scoring compares against question text
    # which produces weaker/clustered signals. Track this in logs to quantify coverage.
    if not reference_answer:
        logger.warning(
            "score_answer: reference_answer is empty for question=%r — "
            "falling back to question_text for similarity and concept signals. "
            "Scores may be less discriminative.",
            question_text[:80] if question_text else "<unknown>",
        )

    # 1. Similarity Score (offline)
    sim_score = compute_similarity(answer_text, reference_answer or question_text)

    # 2. Concept Match Score & missing_keywords
    concept_score, matched, missing = concept_match(answer_text, reference_answer or question_text)

    # 3. LLM Judge Score & feedback_text
    judge_score, feedback, explanation, tips, missing_concepts = llm_judge(answer_text, reference_answer or "", question_text or "")

    # 4. Signal Fusion Step
    # Weights: 0.35 similarity + 0.35 concept match + 0.30 LLM judge
    fused_score = round(
        (0.35 * sim_score) + (0.35 * concept_score) + (0.30 * judge_score),
        3
    )

    return {
        "similarity_score": round(sim_score, 3),
        "concept_match_score": round(concept_score, 3),
        "llm_judge_score": round(judge_score, 3),
        "fused_score": fused_score,
        "human_calibrated_score": None,
        "feedback_text": feedback,
        "missing_keywords": missing_concepts if missing_concepts else missing,
        "matched_keywords": matched,
        "answer_explanation": explanation,
        "tips_and_tricks": tips,
    }
