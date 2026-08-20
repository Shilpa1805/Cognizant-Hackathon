import os
from datetime import datetime, timedelta
import random
from .database import engine, Base, SessionLocal
from .models import Question, Session as InterviewSession, Answer, Score


def seed_database():
    # Re-create all tables
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # 1. Seed 15 Questions across 6 Topics (unevenly spread)
        # Frequencies:
        # System Design: 5
        # Algorithms & Data Structures: 4
        # Database & SQL: 2
        # Behavioral & Leadership: 2
        # Concurrency & Multithreading: 1
        # API Design & Microservices: 1
        questions_data = [
            # System Design (5)
            {"topic": "System Design", "text": "Design a globally distributed URL shortening service like Bitly with high availability.", "difficulty": "Hard"},
            {"topic": "System Design", "text": "How would you architect an in-memory caching system with LRU eviction and cache-stampede mitigation?", "difficulty": "Medium"},
            {"topic": "System Design", "text": "Design a real-time notification service handling 10 million concurrent WebSocket connections.", "difficulty": "Hard"},
            {"topic": "System Design", "text": "Describe the architecture of a distributed rate limiter using Redis and sliding-window counters.", "difficulty": "Medium"},
            {"topic": "System Design", "text": "How would you design a fault-tolerant message queue supporting at-least-once delivery semantics?", "difficulty": "Hard"},

            # Algorithms & Data Structures (4)
            {"topic": "Algorithms & Data Structures", "text": "Explain how to detect and find the start node of a cycle in a singly linked list with O(1) space.", "difficulty": "Medium"},
            {"topic": "Algorithms & Data Structures", "text": "How do you find the lowest common ancestor (LCA) of two nodes in a Binary Search Tree vs a Binary Tree?", "difficulty": "Medium"},
            {"topic": "Algorithms & Data Structures", "text": "Implement an efficient algorithm to solve the Median of Two Sorted Arrays in O(log(min(N,M))) time.", "difficulty": "Hard"},
            {"topic": "Algorithms & Data Structures", "text": "Describe the topological sort algorithm for directed acyclic graphs and explain its time complexity.", "difficulty": "Medium"},

            # Database & SQL (2)
            {"topic": "Database & SQL", "text": "Compare optimistic vs pessimistic concurrency control in distributed relational databases.", "difficulty": "Medium"},
            {"topic": "Database & SQL", "text": "Explain B-Tree vs LSM-Tree storage engines and their trade-offs in read-heavy vs write-heavy workloads.", "difficulty": "Hard"},

            # Behavioral & Leadership (2)
            {"topic": "Behavioral & Leadership", "text": "Tell me about a time you had a technical disagreement with a senior engineer and how you resolved it.", "difficulty": "Easy"},
            {"topic": "Behavioral & Leadership", "text": "Describe a scenario where a production outage occurred on your watch. How did you handle RCA and post-mortem?", "difficulty": "Medium"},

            # Concurrency & Multithreading (1)
            {"topic": "Concurrency & Multithreading", "text": "Explain the difference between mutexes, semaphores, and spinlocks, and when deadlocks occur.", "difficulty": "Hard"},

            # API Design & Microservices (1)
            {"topic": "API Design & Microservices", "text": "How would you design idempotent REST API endpoints for financial transaction processing?", "difficulty": "Medium"},
        ]

        question_objs = []
        for q_data in questions_data:
            q = Question(**q_data)
            db.add(q)
            question_objs.append(q)

        db.commit()
        for q in question_objs:
            db.refresh(q)

        # 2. Seed Sessions, Answers, and Scores for 2 fake users: user_101 & user_202
        base_time = datetime(2026, 8, 1, 10, 0, 0)

        # Realistic candidate session profiles:
        # user_101: 20 sessions (active user, strong in Behavioral, moderate in DB, struggling in System Design & Concurrency)
        # user_202: 12 sessions (newer user)
        sessions_plan = [
            # user_101 attempts
            ("user_101", 0, 0.55, "Explained hashing and database indexing, but forgot to discuss high-availability replica failover.", "failover, replication, ZooKeeper"),
            ("user_101", 1, 0.62, "Defined LRU hash-map correctly, but lacked details on Redis sentinel and distributed locking.", "cache stampede, distributed lock"),
            ("user_101", 2, 0.48, "Mentioned WebSockets but struggled with socket connection load balancing across edge nodes.", "gateway proxy, socket affinity"),
            ("user_101", 3, 0.70, "Sliding window log was clear, good grasp of Redis sorted sets.", "memory overhead"),
            ("user_101", 4, 0.58, "Mentioned Kafka partitions but couldn't explain consumer offset commit edge cases.", "rebalancing, deduplication"),
            ("user_101", 5, 0.85, "Floyd's Tortoise and Hare algorithm explained flawlessly with mathematical proof.", "none"),
            ("user_101", 6, 0.78, "Correct recursive BST traversal, good discussion of tree depth complexity.", "iterative approach"),
            ("user_101", 7, 0.60, "Binary search partition boundary conditions had edge case errors.", "off-by-one, binary search bounds"),
            ("user_101", 8, 0.88, "Kahn's algorithm using in-degree BFS queue implemented cleanly.", "cycle detection edge case"),
            ("user_101", 9, 0.72, "Good explanation of MVCC and row-level locks.", "phantom reads, snapshot isolation"),
            ("user_101", 10, 0.68, "Explained WAL and SSTables for LSM, but confused B-Tree leaf node page splits.", "page fragmentation"),
            ("user_101", 11, 0.92, "STAR method used effectively, demonstrated constructive empathy and data-driven alignment.", "none"),
            ("user_101", 12, 0.95, "Comprehensive incident commander response, blameless post-mortem framework.", "none"),
            ("user_101", 13, 0.45, "Confused atomic compare-and-swap (CAS) with kernel mutex overhead.", "CAS, memory barrier, race conditions"),
            ("user_101", 14, 0.75, "Used Idempotency-Key headers and two-phase commits appropriately.", "distributed saga"),
            ("user_101", 0, 0.65, "Second attempt at Bitly: improved sharding strategy, addressed 64-bit counter overflow.", "base62 encoding"),
            ("user_101", 1, 0.74, "Second attempt at Caching: correctly added probabilistic early expiration (XFetch).", "TTL jitter"),
            ("user_101", 5, 0.90, "Re-attempted cycle detection: fast and confident code implementation.", "none"),
            ("user_101", 7, 0.70, "Re-attempted median of arrays: handled even/odd total length cleanly.", "edge array boundaries"),
            ("user_101", 13, 0.52, "Second attempt at Concurrency: improved explanation of semaphores.", "readers-writer lock"),

            # user_202 attempts (12 sessions)
            ("user_202", 0, 0.82, "Solid high-level design with clear database schema and capacity estimations.", "consistent hashing"),
            ("user_202", 1, 0.80, "Good in-depth explanation of write-through vs write-back caching.", "thundering herd"),
            ("user_202", 5, 0.65, "Used hash set to track nodes (O(N) space) before optimizing to two-pointers.", "constant memory"),
            ("user_202", 6, 0.70, "Implemented BST LCA quickly, but struggled with binary tree with parent pointers.", "parent pointer"),
            ("user_202", 9, 0.85, "Excellent breakdown of SERIALIZABLE isolation levels.", "predicate locks"),
            ("user_202", 10, 0.78, "Accurate discussion of append-only log vs B-Tree random write amplification.", "write amplification"),
            ("user_202", 11, 0.80, "Good communication, structured STAR story on peer conflict.", "metric impact"),
            ("user_202", 12, 0.88, "Clear post-mortem action items and root cause identification.", "alert threshold"),
            ("user_202", 13, 0.82, "Accurately contrasted futex with user-space spinlocks.", "cache line bouncing"),
            ("user_202", 14, 0.90, "Structured REST payload with UUID token validation and database unique constraints.", "none"),
            ("user_202", 2, 0.75, "Pub/Sub architecture with Redis clustered message brokers.", "backpressure"),
            ("user_202", 3, 0.84, "Token bucket algorithm with Leaky bucket comparison.", "burst capacity"),
        ]

        total_sessions = 0
        for i, (user_id, q_idx, score_val, feedback, missing_kw) in enumerate(sessions_plan):
            q = question_objs[q_idx]
            session_time = base_time + timedelta(days=(i * 0.7), hours=(i % 5))

            session = InterviewSession(
                user_id=user_id,
                question_id=q.id,
                timestamp=session_time
            )
            db.add(session)
            db.flush()

            answer = Answer(
                session_id=session.id,
                answer_text=f"Candidate response to question #{q.id} ({q.topic}): {q.text[:60]}... Detailed architectural and algorithmic breakdown provided by candidate.",
                feedback_text=feedback,
                missing_keywords=missing_kw
            )
            db.add(answer)
            db.flush()

            score = Score(
                answer_id=answer.id,
                user_id=user_id,
                topic=q.topic,
                fused_score=score_val
            )
            db.add(score)
            total_sessions += 1

        db.commit()
        print(f"Successfully seeded DB with {len(question_objs)} questions and {total_sessions} session records!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
