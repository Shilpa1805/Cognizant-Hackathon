"""
PrepIQ — Interactive Streamlit Dashboard (Pod 3)
=================================================
Visualizes:
- Topic-wise strengths & weaknesses chart
- Score-over-time trend across mock sessions
- Session history table
- Prioritised Study Plan panel driven by /dashboard/summary
- Scored Answer Feedback & missing_keywords viewer
"""

import os
import requests
import streamlit as st
import pandas as pd
import numpy as np

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

st.set_page_config(
    page_title="PrepIQ — AI Interview Companion",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    .main-header { font-size: 2.2rem; font-weight: 700; color: #4F46E5; }
    .sub-header { font-size: 1.2rem; color: #6B7280; margin-bottom: 20px; }
    .card { background-color: #F9FAFB; border-radius: 10px; padding: 20px; border: 1px solid #E5E7EB; margin-bottom: 15px; }
    .badge-missing { background-color: #FEE2E2; color: #991B1B; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; margin-right: 6px; font-weight: 600; display: inline-block; }
    .badge-topic { background-color: #E0E7FF; color: #3730A3; padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; }
    .score-high { color: #059669; font-weight: 700; }
    .score-med { color: #D97706; font-weight: 700; }
    .score-low { color: #DC2626; font-weight: 700; }
</style>
""", unsafe_allow_html=True)

st.markdown("<div class='main-header'>PrepIQ — AI Interview Companion</div>", unsafe_allow_html=True)
st.markdown("<div class='sub-header'>Real-time performance analytics, adaptive question generation & scoring breakdown</div>", unsafe_allow_html=True)

# Sidebar — Settings & Auth
st.sidebar.header("Student Profile & Navigation")
user_email = st.sidebar.text_input("User Email", "shilpa@mace.ac.in")
role_choice = st.sidebar.selectbox("Target Role", ["Software Development Engineer (SDE)", "Data Analyst"])
st.sidebar.markdown("---")

nav_choice = st.sidebar.radio("Navigation", ["Dashboard & Analytics", "Practice Interview Mode", "Calibration Validation (Pod 2)"])


@st.cache_data(ttl=5)
def fetch_dashboard_summary():
    try:
        res = requests.get(f"{BACKEND_URL}/dashboard/summary", timeout=3)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        pass
    
    # Fallback mock data matching backend schema shapes
    return {
        "user_id": "usr_001",
        "overall_avg_score": 67.5,
        "total_answers": 12,
        "topic_summaries": [
            {"topic_id": "t1", "topic_name": "System Design", "avg_score": 42.0, "attempts_count": 2, "question_frequency": 5, "priority_rank": 1},
            {"topic_id": "t2", "topic_name": "Data Structures & Algorithms", "avg_score": 78.5, "attempts_count": 4, "question_frequency": 6, "priority_rank": 2},
            {"topic_id": "t3", "topic_name": "Behavioral & Communication", "avg_score": 82.0, "attempts_count": 6, "question_frequency": 3, "priority_rank": 3},
        ],
        "study_plan": [
            {"priority_rank": 1, "topic_name": "System Design", "avg_score": 42.0, "reason": "Rank #1: Low score (42.0%) with high question frequency (5 in bank)", "recommended_resources": ["Designing Data-Intensive Applications", "System Design Primer"]},
            {"priority_rank": 2, "topic_name": "Data Structures & Algorithms", "avg_score": 78.5, "reason": "Rank #2: Medium score (78.5%) with frequent practice", "recommended_resources": ["LeetCode Top 100", "NeetCode 150"]},
        ]
    }


data = fetch_dashboard_summary()

if nav_choice == "Dashboard & Analytics":
    # Metrics Row
    m1, m2, m3 = st.columns(3)
    with m1:
        st.metric("Overall Average Score", f"{data.get('overall_avg_score', 0)}%")
    with m2:
        st.metric("Total Practiced Questions", data.get("total_answers", 0))
    with m3:
        st.metric("Target Role", role_choice)

    st.markdown("---")
    c1, c2 = st.columns([3, 2])

    with c1:
        st.subheader("📊 Topic Strengths & Weaknesses")
        topic_items = data.get("topic_summaries", [])
        if topic_items:
            df_topics = pd.DataFrame(topic_items)
            df_chart = df_topics.set_index("topic_name")[["avg_score"]]
            st.bar_chart(df_chart, height=280)
        else:
            st.info("No topic progress data available yet.")

    with c2:
        st.subheader("🎯 Prioritised Study Plan")
        study_plan = data.get("study_plan", [])
        for item in study_plan:
            with st.container():
                st.markdown(f"**#{item['priority_rank']} {item['topic_name']}** — Avg Score: `{item['avg_score']}%`")
                st.caption(item['reason'])
                st.markdown("**Recommended Resources:**")
                for res in item.get('recommended_resources', []):
                    st.markdown(f"- [{res}]({res})" if res.startswith("http") else f"- {res}")
                st.markdown("---")

    st.markdown("---")
    st.subheader("📈 Score Progression Over Time")
    
    # Generate session history mock/live trend
    dates = pd.date_range(end=pd.Timestamp.now(), periods=10, freq="D")
    scores_trend = [55, 58, 62, 60, 68, 71, 69, 74, 78, 82]
    df_trend = pd.DataFrame({"Date": dates, "Fused Score (%)": scores_trend}).set_index("Date")
    st.line_chart(df_trend, height=220)

    st.markdown("---")
    st.subheader("📝 Recent Practice Answers & Scoring Breakdown")

    # Sample detailed answer score records
    sample_answers = [
        {
            "question": "How do you detect a cycle in a singly linked list?",
            "user_answer": "Use fast and slow pointers. If they meet at any node, a cycle exists.",
            "fused_score": 0.88,
            "similarity_score": 0.85,
            "concept_match_score": 0.90,
            "llm_judge_score": 0.90,
            "feedback": "Excellent response! You clearly identified Floyd's Cycle-Finding Algorithm.",
            "missing_keywords": ["O(1) space complexity", "time complexity O(N)"],
        },
        {
            "question": "Explain the trade-offs between SQL and NoSQL databases.",
            "user_answer": "SQL is structured and NoSQL scales well for unorganized data.",
            "fused_score": 0.52,
            "similarity_score": 0.50,
            "concept_match_score": 0.55,
            "llm_judge_score": 0.50,
            "feedback": "Basic response. Be sure to elaborate on ACID compliance vs eventual consistency.",
            "missing_keywords": ["ACID compliance", "vertical vs horizontal scaling", "eventual consistency"],
        }
    ]

    for ans in sample_answers:
        with st.expander(f"Question: {ans['question']} — Score: {int(ans['fused_score']*100)}%"):
            col_a, col_b, col_c, col_d = st.columns(4)
            col_a.metric("Fused Score", f"{int(ans['fused_score']*100)}%")
            col_b.metric("Similarity", f"{int(ans['similarity_score']*100)}%")
            col_c.metric("Concept Match", f"{int(ans['concept_match_score']*100)}%")
            col_d.metric("LLM Judge", f"{int(ans['llm_judge_score']*100)}%")
            
            st.markdown(f"**Student Answer:** {ans['user_answer']}")
            st.info(f"💡 **AI Feedback:** {ans['feedback']}")
            
            st.markdown("**Missing Concepts / Keywords:**")
            badges = "".join([f"<span class='badge-missing'>{kw}</span>" for kw in ans['missing_keywords']])
            st.markdown(badges, unsafe_allow_html=True)


elif nav_choice == "Practice Interview Mode":
    st.subheader("💡 Interactive Question & Answer Practice")
    
    col_sel1, col_sel2 = st.columns(2)
    with col_sel1:
        sel_topic = st.selectbox("Select Topic", ["Data Structures & Algorithms", "System Design", "Behavioral & Communication"])
    with col_sel2:
        if st.button("Fetch Next Question (/questions/next)"):
            try:
                r = requests.get(f"{BACKEND_URL}/questions/next", timeout=3)
                if r.status_code == 200:
                    st.session_state["current_q"] = r.json()
            except Exception:
                pass

    if "current_q" not in st.session_state:
        st.session_state["current_q"] = {
            "question_id": "11111111-1111-1111-1111-000000000101",
            "question_text": "How do you detect a cycle in a singly linked list?",
            "reference_answer": "Use Floyd's Cycle-Finding Algorithm (Fast and Slow Pointers).",
            "difficulty": "Medium",
            "source": "curated_bank"
        }

    q_data = st.session_state["current_q"]
    st.markdown(f"### Question: {q_data['question_text']}")
    st.caption(f"Difficulty: {q_data.get('difficulty', 'Medium')} | Source: {q_data.get('source', 'bank')}")

    user_text_ans = st.text_area("Your Answer:", height=150, placeholder="Type your detailed explanation here...")

    if st.button("Submit Answer (/answers/submit)"):
        if not user_text_ans.strip():
            st.warning("Please type an answer before submitting.")
        else:
            with st.spinner("Running 3-Signal AI Scoring Pipeline..."):
                try:
                    payload = {
                        "question_id": q_data.get("question_id"),
                        "user_id": "usr_001",
                        "answer_text": user_text_ans
                    }
                    res = requests.post(f"{BACKEND_URL}/answers/submit", json=payload, timeout=5)
                    if res.status_code in (200, 201):
                        s_data = res.json()
                        st.success("Answer scored successfully!")
                        st.json(s_data)
                    else:
                        st.error(f"Backend error: {res.status_code}")
                except Exception as exc:
                    st.error(f"Could not connect to backend endpoint: {exc}")


elif nav_choice == "Calibration Validation (Pod 2)":
    st.subheader("🧪 Pod 2 Calibration Check — Model Validation")
    st.markdown("Compares hand-rated gold benchmark answers against the 3-signal fused scores to verify Pearson ($r$) and Spearman ($\\rho$) correlations.")

    if st.button("Run Calibration Validation"):
        try:
            from app.services.calibration import run_calibration_check
            metrics = run_calibration_check()
            
            c1, c2, c3 = st.columns(3)
            c1.metric("Benchmark Samples", metrics["sample_count"])
            c2.metric("Pearson Correlation (r)", f"{metrics['pearson_r']}")
            c3.metric("Spearman Correlation (rho)", f"{metrics['spearman_rho']}")

            st.markdown("### Itemized Evaluation Results")
            st.dataframe(pd.DataFrame(metrics["itemized"]))
        except Exception as exc:
            st.error(f"Calibration test error: {exc}")
