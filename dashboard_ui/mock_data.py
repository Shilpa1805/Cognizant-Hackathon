from typing import Dict, Any
import requests

# Set this flag to False to point to live backend by default, or control via UI
USE_MOCK_DATA_DEFAULT = True
BACKEND_API_URL = "http://localhost:8000/dashboard/summary"

# Mock JSON dataset conforming exactly to the Part 1 JSON contract
MOCK_DASHBOARD_DATA: Dict[str, Dict[str, Any]] = {
    "user_101": {
        "topic_scores": [
            {
                "topic": "System Design",
                "avg_score": 0.6180,
                "num_attempts": 5
            },
            {
                "topic": "Algorithms & Data Structures",
                "avg_score": 0.8175,
                "num_attempts": 4
            },
            {
                "topic": "Database & SQL",
                "avg_score": 0.7000,
                "num_attempts": 2
            },
            {
                "topic": "Behavioral & Leadership",
                "avg_score": 0.9350,
                "num_attempts": 2
            },
            {
                "topic": "Concurrency & Multithreading",
                "avg_score": 0.4850,
                "num_attempts": 2
            },
            {
                "topic": "API Design & Microservices",
                "avg_score": 0.7500,
                "num_attempts": 1
            }
        ],
        "study_plan": [
            {
                "topic": "System Design",
                "priority_rank": 1,
                "priority_score": 1.9100,
                "avg_score": 0.6180
            },
            {
                "topic": "Algorithms & Data Structures",
                "priority_rank": 2,
                "priority_score": 0.7300,
                "avg_score": 0.8175
            },
            {
                "topic": "Database & SQL",
                "priority_rank": 3,
                "priority_score": 0.6000,
                "avg_score": 0.7000
            },
            {
                "topic": "Concurrency & Multithreading",
                "priority_rank": 4,
                "priority_score": 0.5150,
                "avg_score": 0.4850
            },
            {
                "topic": "API Design & Microservices",
                "priority_rank": 5,
                "priority_score": 0.2500,
                "avg_score": 0.7500
            },
            {
                "topic": "Behavioral & Leadership",
                "priority_rank": 6,
                "priority_score": 0.1300,
                "avg_score": 0.9350
            }
        ],
        "session_history": [
            {
                "session_id": 1,
                "topic": "System Design",
                "question_text": "Design a globally distributed URL shortening service like Bitly with high availability.",
                "score": 0.5500,
                "timestamp": "2026-08-01 10:00:00",
                "feedback_text": "Explained hashing and database indexing, but forgot to discuss high-availability replica failover.",
                "missing_keywords": ["failover", "replication", "ZooKeeper"]
            },
            {
                "session_id": 2,
                "topic": "System Design",
                "question_text": "How would you architect an in-memory caching system with LRU eviction and cache-stampede mitigation?",
                "score": 0.6200,
                "timestamp": "2026-08-02 11:00:00",
                "feedback_text": "Defined LRU hash-map correctly, but lacked details on Redis sentinel and distributed locking.",
                "missing_keywords": ["cache stampede", "distributed lock"]
            },
            {
                "session_id": 3,
                "topic": "System Design",
                "question_text": "Design a real-time notification service handling 10 million concurrent WebSocket connections.",
                "score": 0.4800,
                "timestamp": "2026-08-03 12:00:00",
                "feedback_text": "Mentioned WebSockets but struggled with socket connection load balancing across edge nodes.",
                "missing_keywords": ["gateway proxy", "socket affinity"]
            },
            {
                "session_id": 4,
                "topic": "System Design",
                "question_text": "Describe the architecture of a distributed rate limiter using Redis and sliding-window counters.",
                "score": 0.7000,
                "timestamp": "2026-08-04 13:00:00",
                "feedback_text": "Sliding window log was clear, good grasp of Redis sorted sets.",
                "missing_keywords": ["memory overhead"]
            },
            {
                "session_id": 5,
                "topic": "System Design",
                "question_text": "How would you design a fault-tolerant message queue supporting at-least-once delivery semantics?",
                "score": 0.5800,
                "timestamp": "2026-08-05 14:00:00",
                "feedback_text": "Mentioned Kafka partitions but couldn't explain consumer offset commit edge cases.",
                "missing_keywords": ["rebalancing", "deduplication"]
            },
            {
                "session_id": 6,
                "topic": "Algorithms & Data Structures",
                "question_text": "Explain how to detect and find the start node of a cycle in a singly linked list with O(1) space.",
                "score": 0.8500,
                "timestamp": "2026-08-06 10:00:00",
                "feedback_text": "Floyd's Tortoise and Hare algorithm explained flawlessly with mathematical proof.",
                "missing_keywords": []
            },
            {
                "session_id": 7,
                "topic": "Algorithms & Data Structures",
                "question_text": "How do you find the lowest common ancestor (LCA) of two nodes in a Binary Search Tree vs a Binary Tree?",
                "score": 0.7800,
                "timestamp": "2026-08-07 11:00:00",
                "feedback_text": "Correct recursive BST traversal, good discussion of tree depth complexity.",
                "missing_keywords": ["iterative approach"]
            },
            {
                "session_id": 8,
                "topic": "Algorithms & Data Structures",
                "question_text": "Implement an efficient algorithm to solve the Median of Two Sorted Arrays in O(log(min(N,M))) time.",
                "score": 0.6000,
                "timestamp": "2026-08-08 12:00:00",
                "feedback_text": "Binary search partition boundary conditions had edge case errors.",
                "missing_keywords": ["off-by-one", "binary search bounds"]
            },
            {
                "session_id": 9,
                "topic": "Algorithms & Data Structures",
                "question_text": "Describe the topological sort algorithm for directed acyclic graphs and explain its time complexity.",
                "score": 0.8800,
                "timestamp": "2026-08-09 13:00:00",
                "feedback_text": "Kahn's algorithm using in-degree BFS queue implemented cleanly.",
                "missing_keywords": ["cycle detection edge case"]
            },
            {
                "session_id": 10,
                "topic": "Database & SQL",
                "question_text": "Compare optimistic vs pessimistic concurrency control in distributed relational databases.",
                "score": 0.7200,
                "timestamp": "2026-08-10 14:00:00",
                "feedback_text": "Good explanation of MVCC and row-level locks.",
                "missing_keywords": ["phantom reads", "snapshot isolation"]
            },
            {
                "session_id": 11,
                "topic": "Database & SQL",
                "question_text": "Explain B-Tree vs LSM-Tree storage engines and their trade-offs in read-heavy vs write-heavy workloads.",
                "score": 0.6800,
                "timestamp": "2026-08-11 10:00:00",
                "feedback_text": "Explained WAL and SSTables for LSM, but confused B-Tree leaf node page splits.",
                "missing_keywords": ["page fragmentation"]
            },
            {
                "session_id": 12,
                "topic": "Behavioral & Leadership",
                "question_text": "Tell me about a time you had a technical disagreement with a senior engineer and how you resolved it.",
                "score": 0.9200,
                "timestamp": "2026-08-12 11:00:00",
                "feedback_text": "STAR method used effectively, demonstrated constructive empathy and data-driven alignment.",
                "missing_keywords": []
            },
            {
                "session_id": 13,
                "topic": "Behavioral & Leadership",
                "question_text": "Describe a scenario where a production outage occurred on your watch. How did you handle RCA and post-mortem?",
                "score": 0.9500,
                "timestamp": "2026-08-13 12:00:00",
                "feedback_text": "Comprehensive incident commander response, blameless post-mortem framework.",
                "missing_keywords": []
            },
            {
                "session_id": 14,
                "topic": "Concurrency & Multithreading",
                "question_text": "Explain the difference between mutexes, semaphores, and spinlocks, and when deadlocks occur.",
                "score": 0.4500,
                "timestamp": "2026-08-14 13:00:00",
                "feedback_text": "Confused atomic compare-and-swap (CAS) with kernel mutex overhead.",
                "missing_keywords": ["CAS", "memory barrier", "race conditions"]
            },
            {
                "session_id": 15,
                "topic": "API Design & Microservices",
                "question_text": "How would you design idempotent REST API endpoints for financial transaction processing?",
                "score": 0.7500,
                "timestamp": "2026-08-15 14:00:00",
                "feedback_text": "Used Idempotency-Key headers and two-phase commits appropriately.",
                "missing_keywords": ["distributed saga"]
            }
        ]
    }
}


def get_dashboard_summary(
    user_id: str = "user_101",
    use_mock: bool = USE_MOCK_DATA_DEFAULT,
    api_url: str = BACKEND_API_URL
) -> Dict[str, Any]:
    """
    Unified data fetching function.
    Returns mock JSON or calls the live FastAPI backend without requiring UI code changes.
    """
    if use_mock:
        # Fallback to user_101 mock data if requested user_id not found in static dict
        return MOCK_DASHBOARD_DATA.get(user_id, MOCK_DASHBOARD_DATA["user_101"])

    # Live backend request
    try:
        response = requests.get(
            api_url,
            params={"user_id": user_id},
            timeout=5.0
        )
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        # If backend request fails, return mock data with a warning flag
        fallback = MOCK_DASHBOARD_DATA.get(user_id, MOCK_DASHBOARD_DATA["user_101"]).copy()
        fallback["_error"] = f"Backend API call failed ({str(exc)}). Displaying fallback mock data."
        return fallback
