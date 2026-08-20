import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from typing import Dict, Any

try:
    from .mock_data import get_dashboard_summary, BACKEND_API_URL
except (ImportError, ValueError):
    from mock_data import get_dashboard_summary, BACKEND_API_URL

# -------------------------------------------------------------
# App Configuration & Constants
# -------------------------------------------------------------
st.set_page_config(
    page_title="AI Interview Companion | Performance Dashboard",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="expanded",
)

DEFAULT_USER_ID = "user_101"

# -------------------------------------------------------------
# Custom Styling (Dark/Modern Theme)
# -------------------------------------------------------------
st.markdown(
    """
    <style>
    /* Metric Cards */
    .metric-card {
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 18px 20px;
        margin-bottom: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }
    .metric-label {
        font-size: 0.85rem;
        font-weight: 500;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .metric-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: #f8fafc;
        margin-top: 4px;
    }
    .metric-sub {
        font-size: 0.8rem;
        color: #38bdf8;
        margin-top: 2px;
    }

    /* Study Plan Card */
    .plan-card {
        background: rgba(30, 41, 59, 0.6);
        border-left: 4px solid #6366f1;
        border-radius: 8px;
        padding: 14px 18px;
        margin-bottom: 10px;
        transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .plan-card:hover {
        transform: translateY(-2px);
        border-left-color: #a855f7;
    }
    .rank-badge {
        background: linear-gradient(135deg, #6366f1, #a855f7);
        color: white;
        font-weight: 700;
        font-size: 0.75rem;
        padding: 3px 8px;
        border-radius: 9999px;
        display: inline-block;
        margin-right: 8px;
    }
    .keyword-pill {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 0.78rem;
        display: inline-block;
        margin: 3px 4px 3px 0;
    }
    .success-pill {
        background: rgba(34, 197, 94, 0.15);
        color: #4ade80;
        border: 1px solid rgba(34, 197, 94, 0.3);
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 0.78rem;
        display: inline-block;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# -------------------------------------------------------------
# Sidebar: Settings & Data Source Toggle
# -------------------------------------------------------------
with st.sidebar:
    st.title("🎯 Dashboard Pod")
    st.caption("AI Interview Preparation Companion")
    st.divider()

    st.subheader("Candidate Profile")
    user_id = st.selectbox(
        "Select User ID",
        options=["user_101", "user_202"],
        index=0,
        help="Hardcoded mock candidate profile"
    )

    st.divider()
    st.subheader("Data Source")
    use_mock_data = st.toggle(
        "Use Mock JSON Data",
        value=True,
        help="Toggle between static Mock JSON and live FastAPI Backend"
    )

    backend_url_input = BACKEND_API_URL
    if not use_mock_data:
        backend_url_input = st.text_input(
            "Backend Endpoint",
            value=BACKEND_API_URL,
            help="URL to the FastAPI /dashboard/summary endpoint"
        )

    st.markdown(
        f"""
        <div style='margin-top: 20px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px;'>
            <span style='color: {'#4ade80' if use_mock_data else '#38bdf8'}; font-weight: 600;'>
                {'● Mock Mode Active' if use_mock_data else '● Live API Mode Active'}
            </span>
            <div style='font-size: 0.75rem; color: #94a3b8; margin-top: 4px;'>
                {'(Isolated static JSON contract)' if use_mock_data else f'Targeting: {backend_url_input}'}
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )

# -------------------------------------------------------------
# Data Fetching
# -------------------------------------------------------------
data = get_dashboard_summary(
    user_id=user_id,
    use_mock=use_mock_data,
    api_url=backend_url_input
)

if "_error" in data:
    st.warning(data["_error"])

topic_scores_list = data.get("topic_scores", [])
study_plan_list = data.get("study_plan", [])
session_history_list = data.get("session_history", [])

# Overall Summary KPI Calculations
total_attempts = sum(item.get("num_attempts", 0) for item in topic_scores_list)
overall_avg = (
    sum(item.get("avg_score", 0) * item.get("num_attempts", 0) for item in topic_scores_list) / total_attempts
    if total_attempts > 0 else 0.0
)
top_focus_topic = study_plan_list[0]["topic"] if study_plan_list else "None"
top_priority_score_str = f"{study_plan_list[0]['priority_score']:.2f}" if study_plan_list else "0.00"

if topic_scores_list:
    best_item = max(topic_scores_list, key=lambda x: x.get("avg_score", 0.0))
    best_topic = best_item["topic"]
    best_score_val = best_item["avg_score"] * 100.0
else:
    best_topic = "None"
    best_score_val = 0.0

# -------------------------------------------------------------
# Header & Top Metrics
# -------------------------------------------------------------
st.title("📊 Candidate Interview Analytics")
st.markdown(f"Real-time diagnostic summary and prioritized learning path for **Candidate `{user_id}`**.")

col_kpi1, col_kpi2, col_kpi3, col_kpi4 = st.columns(4)

with col_kpi1:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">Overall Average</div>
            <div class="metric-value">{overall_avg * 100:.1f}%</div>
            <div class="metric-sub">Across all {len(topic_scores_list)} topics</div>
        </div>
        """,
        unsafe_allow_html=True
    )

with col_kpi2:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">Total Mock Interviews</div>
            <div class="metric-value">{len(session_history_list)}</div>
            <div class="metric-sub">{total_attempts} scored question attempts</div>
        </div>
        """,
        unsafe_allow_html=True
    )

with col_kpi3:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">Top Focus Area (Rank 1)</div>
            <div class="metric-value" style="font-size: 1.3rem; color: #f43f5e;">{top_focus_topic}</div>
            <div class="metric-sub">Priority Score: {top_priority_score_str}</div>
        </div>
        """,
        unsafe_allow_html=True
    )

with col_kpi4:
    st.markdown(
        f"""
        <div class="metric-card">
            <div class="metric-label">Strongest Domain</div>
            <div class="metric-value" style="font-size: 1.3rem; color: #22c55e;">{best_topic}</div>
            <div class="metric-sub">Proficiency: {best_score_val:.1f}%</div>
        </div>
        """,
        unsafe_allow_html=True
    )

st.write("")

# -------------------------------------------------------------
# Component 1: Topic-wise Bar / Radar Chart (Plotly)
# -------------------------------------------------------------
st.subheader("1. Topic-wise Performance Analysis")

col_chart_opts, col_chart_view = st.columns([1, 4])
with col_chart_opts:
    chart_type = st.radio("Chart Representation", ["Horizontal Bar", "Radar / Polar"], index=0)

with col_chart_view:
    if topic_scores_list:
        df_topics = pd.DataFrame(topic_scores_list)
        df_topics["score_pct"] = df_topics["avg_score"] * 100

        if chart_type == "Horizontal Bar":
            fig_bar = px.bar(
                df_topics.sort_values(by="avg_score", ascending=True),
                x="score_pct",
                y="topic",
                orientation="h",
                color="score_pct",
                color_continuous_scale=["#ef4444", "#f59e0b", "#10b981"],
                text=df_topics.sort_values(by="avg_score", ascending=True)["score_pct"].apply(lambda v: f"{v:.1f}%"),
                labels={"score_pct": "Average Score (%)", "topic": "Interview Topic"},
                height=360
            )
            fig_bar.update_layout(
                margin=dict(l=20, r=20, t=20, b=20),
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(range=[0, 100], gridcolor="rgba(255,255,255,0.1)"),
                yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
                coloraxis_showscale=False,
                font=dict(color="#f8fafc")
            )
            st.plotly_chart(fig_bar, use_container_width=True)
        else:
            # Radar chart
            radar_topics = list(df_topics["topic"]) + [df_topics["topic"].iloc[0]]
            radar_scores = list(df_topics["score_pct"]) + [df_topics["score_pct"].iloc[0]]

            fig_radar = go.Figure(
                data=go.Scatterpolar(
                    r=radar_scores,
                    theta=radar_topics,
                    fill='toself',
                    fillcolor='rgba(99, 102, 241, 0.35)',
                    line=dict(color='#818cf8', width=2),
                    marker=dict(size=7, color='#c084fc')
                )
            )
            fig_radar.update_layout(
                polar=dict(
                    radialaxis=dict(visible=True, range=[0, 100], gridcolor="rgba(255,255,255,0.15)"),
                    angularaxis=dict(gridcolor="rgba(255,255,255,0.15)")
                ),
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                font=dict(color="#f8fafc"),
                height=380,
                margin=dict(l=40, r=40, t=30, b=30)
            )
            st.plotly_chart(fig_radar, use_container_width=True)
    else:
        st.info("No topic scores available.")

st.divider()

# -------------------------------------------------------------
# Component 2: Score-over-time Line Chart (Plotly)
# -------------------------------------------------------------
st.subheader("2. Performance Progression Over Time")

if session_history_list:
    df_history = pd.DataFrame(session_history_list)
    df_history["score_pct"] = df_history["score"] * 100
    df_history["timestamp_dt"] = pd.to_datetime(df_history["timestamp"])
    df_history = df_history.sort_values(by="timestamp_dt")

    fig_line = px.line(
        df_history,
        x="timestamp",
        y="score_pct",
        color="topic",
        markers=True,
        hover_data={"question_text": True, "score_pct": ":.1f", "timestamp": True},
        labels={"score_pct": "Score (%)", "timestamp": "Interview Session Date/Time", "topic": "Topic"},
        height=380
    )
    fig_line.update_traces(
        line=dict(width=2.5),
        marker=dict(size=8, symbol="circle")
    )
    fig_line.add_hline(
        y=70,
        line_dash="dash",
        line_color="#f59e0b",
        annotation_text="Passing Threshold (70%)",
        annotation_position="bottom right"
    )
    fig_line.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
        yaxis=dict(range=[0, 105], gridcolor="rgba(255,255,255,0.1)"),
        font=dict(color="#f8fafc"),
        margin=dict(l=20, r=20, t=30, b=20),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    st.plotly_chart(fig_line, use_container_width=True)
else:
    st.info("No session history recorded yet.")

st.divider()

# -------------------------------------------------------------
# Layout: Component 3 (Session History Table) & Component 4 (Study Plan)
# -------------------------------------------------------------
col_table, col_plan = st.columns([3, 2])

with col_table:
    # -------------------------------------------------------------
    # Component 3: Session History Table
    # -------------------------------------------------------------
    st.subheader("3. Mock Interview Session History")

    if session_history_list:
        display_df = pd.DataFrame(session_history_list)[
            ["session_id", "timestamp", "topic", "score", "question_text"]
        ].copy()
        display_df["score"] = display_df["score"].apply(lambda s: f"{s*100:.1f}%")
        display_df.columns = ["Session #", "Date & Time", "Topic", "Score", "Question Excerpt"]

        st.dataframe(
            display_df,
            use_container_width=True,
            height=340,
            hide_index=True
        )
    else:
        st.info("No sessions to display.")

with col_plan:
    # -------------------------------------------------------------
    # Component 4: Prioritized Study-Plan Panel (Ordered by priority_rank)
    # -------------------------------------------------------------
    st.subheader("4. AI Prioritized Study Plan")
    st.caption("Ranked by `(1 - avg_score) * question_bank_frequency`")

    if study_plan_list:
        # Sorted strictly by priority_rank
        sorted_plan = sorted(study_plan_list, key=lambda x: x.get("priority_rank", 999))
        for item in sorted_plan:
            rank = item["priority_rank"]
            topic = item["topic"]
            p_score = item["priority_score"]
            avg_score = item["avg_score"] * 100

            # Color styling based on rank
            badge_color = "#f43f5e" if rank == 1 else ("#f59e0b" if rank <= 3 else "#38bdf8")

            st.markdown(
                f"""
                <div class="plan-card" style="border-left-color: {badge_color};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span class="rank-badge" style="background: {badge_color};">Rank #{rank}</span>
                            <strong style="color: #f8fafc; font-size: 0.95rem;">{topic}</strong>
                        </div>
                        <div style="text-align: right;">
                            <span style="color: #94a3b8; font-size: 0.75rem;">Priority Score</span><br/>
                            <strong style="color: {badge_color}; font-size: 0.95rem;">{p_score:.2f}</strong>
                        </div>
                    </div>
                    <div style="margin-top: 8px; font-size: 0.8rem; color: #cbd5e1;">
                        Historical Avg: <span style="font-weight: 600; color: #f8fafc;">{avg_score:.1f}%</span>
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )
    else:
        st.info("No study plan generated.")

st.divider()

# -------------------------------------------------------------
# Component 5: Feedback & Missing Keywords Inspector
# -------------------------------------------------------------
st.subheader("5. AI Feedback & Missing Keywords Inspector")
st.markdown("Detailed diagnostic feedback and missing domain terminology for evaluated interview answers.")

if session_history_list:
    session_options = {
        f"Session #{s['session_id']} ({s['topic']}) - Score: {s['score']*100:.0f}%": s
        for s in session_history_list
    }

    selected_label = st.selectbox(
        "Select an Interview Session to Inspect Feedback:",
        options=list(session_options.keys()),
        index=0
    )

    selected_session = session_options[selected_label]

    col_fb_q, col_fb_details = st.columns([1, 1])

    with col_fb_q:
        st.markdown("**Interview Question:**")
        st.info(selected_session.get("question_text", "N/A"))

        st.markdown(f"**Topic:** `{selected_session.get('topic')}` | **Recorded Score:** `{selected_session.get('score') * 100:.1f}%`")

    with col_fb_details:
        st.markdown("**AI Evaluator Feedback:**")
        feedback = selected_session.get("feedback_text")
        if feedback:
            st.success(feedback)
        else:
            st.write("No specific feedback notes available for this session.")

        st.markdown("**Missing Technical Keywords & Concepts:**")
        keywords = selected_session.get("missing_keywords") or []
        if keywords:
            keywords_html = "".join([f"<span class='keyword-pill'>⚠️ {kw}</span>" for kw in keywords])
            st.markdown(keywords_html, unsafe_allow_html=True)
        else:
            st.markdown("<span class='success-pill'>✨ All critical keywords covered!</span>", unsafe_allow_html=True)
else:
    st.info("No session records available for feedback inspection.")
