# AI Interview Preparation Companion - Dashboard Backend

FastAPI analytical backend for the Dashboard Pod. Aggregates candidate interview performance, computes dynamic priority rankings based on question bank frequency weighting, and provides session histories through a single unified endpoint.

---

## Shared JSON Contract Specification

### Endpoint
`GET /dashboard/summary?user_id={user_id}`

### Response Shape
```json
{
  "topic_scores": [
    {
      "topic": "System Design",
      "avg_score": 0.65,
      "num_attempts": 6
    },
    {
      "topic": "Algorithms & Data Structures",
      "avg_score": 0.81,
      "num_attempts": 4
    }
  ],
  "study_plan": [
    {
      "topic": "System Design",
      "priority_rank": 1,
      "priority_score": 1.75,
      "avg_score": 0.65
    },
    {
      "topic": "Algorithms & Data Structures",
      "priority_rank": 2,
      "priority_score": 0.76,
      "avg_score": 0.81
    }
  ],
  "session_history": [
    {
      "session_id": 1,
      "topic": "System Design",
      "question_text": "Design a globally distributed URL shortening service like Bitly with high availability.",
      "score": 0.55,
      "timestamp": "2026-08-01 10:00:00",
      "feedback_text": "Explained hashing and database indexing, but forgot to discuss high-availability replica failover.",
      "missing_keywords": ["failover", "replication", "ZooKeeper"]
    }
  ]
}
```

---

## Analytical Priority Ranking Formula

The study plan priority score is calculated using a **pure function** (isolated from database I/O for unit-testability):

$$\text{priority\_score} = (1 - \text{avg\_score}) \times \text{topic\_frequency\_in\_question\_bank}$$

- $\text{avg\_score} \in [0.0, 1.0]$: The candidate's historical average score for that topic.
- $\text{topic\_frequency\_in\_question\_bank}$: Total number of questions available for that topic in the question bank.
- Higher $\text{priority\_score}$ represents a topic where the candidate has low proficiency **and/or** which appears frequently in interviews.
- **Rank 1** = Highest Priority. Ties are broken alphabetically by topic name.

---

## Local Development & Testing

### 1. Database Schema
Models reside in `models.py`:
- `Question`: `id`, `topic`, `text`, `difficulty`
- `Session`: `id`, `user_id`, `question_id`, `timestamp`
- `Answer`: `id`, `session_id`, `answer_text`, `feedback_text`, `missing_keywords`
- `Score`: `id`, `answer_id`, `user_id`, `topic`, `fused_score`

### 2. Seed Mock Database
Populate the SQLite DB (`mock_dashboard.db`) with 2 candidate profiles (`user_101`, `user_202`), 6 topics, 15 unevenly distributed questions, and 32 session/score records:
```bash
python -m dashboard_backend.seed
```

### 3. Run FastAPI Backend
Start the uvicorn development server on port 8000:
```powershell
py -m uvicorn dashboard_backend.main:app --reload --port 8000
```
Swagger UI documentation is available at: `http://localhost:8000/docs`.

### 4. Run Pytest Suite
```powershell
py -m pytest dashboard_backend/test_dashboard.py -v
```
