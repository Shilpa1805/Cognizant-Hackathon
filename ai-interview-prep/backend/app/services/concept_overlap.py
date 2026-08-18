import spacy

nlp = spacy.load("en_core_web_sm")

def extract_concepts(text: str) -> set[str]:
    if not text or not text.strip():
        return set()

    doc = nlp(text)

    concepts = set()

    for chunk in doc.noun_chunks:
        concept = normalize_concept(chunk.text)
        if concept:
            concepts.add(concept)

    for entity in doc.ents:
        concept = normalize_concept(entity.text)
        if concept:
            concepts.add(concept)

    return concepts

def normalize_concept(text: str) -> str:
    text = text.strip()
    doc = nlp(text)

    words = []

    for token in doc:
        if not token.is_stop and not token.is_punct:
            words.append(token.lemma_.lower())

    return " ".join(words)

def concept_match_score(
    reference_concept: str,
    answer_concepts: set[str]
) -> float:
    """
    Returns:
        1.0 -> full concept match
        0.5 -> partial concept match
        0.0 -> no match
    """

    reference_tokens = set(reference_concept.split())

    if not reference_tokens:
        return 0.0

    for answer_concept in answer_concepts:

        answer_tokens = set(answer_concept.split())

        # Exact match
        if reference_concept == answer_concept:
            return 1.0

        # One concept completely contains the other
        if reference_tokens.issubset(answer_tokens):
            return 1.0

        if answer_tokens.issubset(reference_tokens):
            return 0.5

    return 0.0

def concept_overlap(
    answer_text: str,
    reference_answer: str
) -> dict:

    # Empty reference answer
    if not reference_answer or not reference_answer.strip():
        return {
            "score": 1.0,
            "missing_concepts": []
        }

    # Empty student answer
    if not answer_text or not answer_text.strip():
        reference_concepts = extract_concepts(reference_answer)

        return {
            "score": 0.0,
            "missing_concepts": sorted(reference_concepts)
        }

    reference_concepts = extract_concepts(reference_answer)
    answer_concepts = extract_concepts(answer_text)

    if not reference_concepts:
        return {
            "score": 1.0,
            "missing_concepts": []
        }

    total_score = 0.0
    missing_concepts = []

    for concept in reference_concepts:
        match = concept_match_score(
            concept,
            answer_concepts
        )

        total_score += match

        if match == 0.0:
            missing_concepts.append(concept)

        elif match == 0.5:
            reference_tokens = set(concept.split())

            for answer_concept in answer_concepts:
                answer_tokens = set(answer_concept.split())

                if answer_tokens.issubset(reference_tokens):
                    missing_tokens = reference_tokens - answer_tokens

                    missing_concepts.extend(missing_tokens)
                    break

    score = total_score / len(reference_concepts)

    return {
        "score": round(score, 4),
        "missing_concepts": sorted(missing_concepts)
    }
