# AI Interview Preparation Companion - Dashboard UI

Interactive Streamlit & Plotly analytics frontend for candidate interview performance tracking, dynamic priority study planning, and detailed AI feedback inspection.

---

## Features & Components

Built in strict compliance with the shared JSON contract from the Dashboard Backend:

1. **Topic-wise Performance Chart (Plotly)**:
   - Visualizes candidate scores across all interview domains with a toggle between Horizontal Bar and Radar/Polar charts.
2. **Score-over-time Progression Chart (Plotly)**:
   - Chronological score progression with multi-topic lines, interactive tooltips, and passing threshold markers.
3. **Mock Interview Session History Table**:
   - Filterable data table displaying session timestamps, topics, scores, and question excerpts.
4. **Prioritized Study-Plan Panel**:
   - Ranked list ordered strictly by `priority_rank`, calculated from the frequency-weighted priority formula:
     $$\text{priority\_score} = (1 - \text{avg\_score}) \times \text{question\_bank\_frequency}$$
5. **AI Feedback & Missing Keywords Inspector**:
   - Detailed per-session feedback viewer displaying qualitative suggestions and missing domain keywords.

---

## Running the UI Standalone (Mock JSON Mode)

The UI defaults to **Mock JSON Mode** (`USE_MOCK_DATA_DEFAULT = True`), allowing full frontend development and evaluation without requiring the FastAPI backend to be running.

### Launch Streamlit:
```powershell
py -m streamlit run dashboard_ui/app.py
```

---

## Connecting to Live FastAPI Backend

To switch from mock data to the live backend:

1. Start the FastAPI backend on port 8000:
   ```powershell
   py -m uvicorn dashboard_backend.main:app --port 8000
   ```
2. In the Streamlit sidebar, toggle **"Use Mock JSON Data"** to **OFF** (or set `USE_MOCK_DATA_DEFAULT = False` in `dashboard_ui/mock_data.py`).
3. The single data fetcher `get_dashboard_summary(user_id)` will query `http://localhost:8000/dashboard/summary?user_id=...` and render live DB data immediately.
