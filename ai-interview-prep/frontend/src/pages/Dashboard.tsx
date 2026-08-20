import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../lib/api'

interface DashboardTopicAverage {
  topic_id: string
  topic_name: string
  avg_score: number
  question_frequency: number
}

interface DashboardStudyPlanItem {
  topic_id: string
  topic_name: string
  priority_rank: number
  recommended_focus: string
  avg_score: number
  question_frequency: number
}

interface DashboardSessionHistoryItem {
  session_id: string
  started_at: string
  ended_at: string | null
  overall_session_score: number | null
}

interface DashboardSummaryResponse {
  user_id: string
  topic_average_scores: DashboardTopicAverage[]
  study_plan: DashboardStudyPlanItem[]
  session_history: DashboardSessionHistoryItem[]
}

interface PastAnswerFeedback {
  answer_id: string
  session_id: string
  question_id: string
  user_id: string
  question_text: string
  answer_text: string
  submitted_at: string
  difficulty: string | null
  feedback_text: string | null
  missing_keywords: string[] | null
  fused_score: number | null
}

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001'
const USE_MOCK_DASHBOARD_DATA = true

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatScore(score: number | null) {
  if (score === null) return '—'
  return `${Math.round(score)}%`
}

function getMockDashboardSummary(userId: string): DashboardSummaryResponse {
  return {
    user_id: userId,
    topic_average_scores: [
      {
        topic_id: '44444444-4444-4444-4444-444444444444',
        topic_name: 'Databases',
        avg_score: 38,
        question_frequency: 18,
      },
      {
        topic_id: '33333333-3333-3333-3333-333333333333',
        topic_name: 'System Design',
        avg_score: 52,
        question_frequency: 26,
      },
      {
        topic_id: '55555555-5555-5555-5555-555555555555',
        topic_name: 'Algorithms',
        avg_score: 67,
        question_frequency: 21,
      },
      {
        topic_id: '22222222-2222-2222-2222-222222222222',
        topic_name: 'Operating Systems',
        avg_score: 74,
        question_frequency: 14,
      },
    ],
    study_plan: [
      {
        topic_id: '44444444-4444-4444-4444-444444444444',
        topic_name: 'Databases',
        priority_rank: 1,
        recommended_focus: 'High priority: rebuild SQL indexing and query optimization fundamentals.',
        avg_score: 38,
        question_frequency: 18,
      },
      {
        topic_id: '33333333-3333-3333-3333-333333333333',
        topic_name: 'System Design',
        priority_rank: 2,
        recommended_focus: 'Medium priority: improve trade-off explanations for scalability and reliability.',
        avg_score: 52,
        question_frequency: 26,
      },
      {
        topic_id: '55555555-5555-5555-5555-555555555555',
        topic_name: 'Algorithms',
        priority_rank: 3,
        recommended_focus: 'Medium priority: practice edge-case communication and complexity analysis.',
        avg_score: 67,
        question_frequency: 21,
      },
      {
        topic_id: '22222222-2222-2222-2222-222222222222',
        topic_name: 'Operating Systems',
        priority_rank: 4,
        recommended_focus: 'Maintenance priority: continue light revision to keep recall sharp.',
        avg_score: 74,
        question_frequency: 14,
      },
    ],
    session_history: [
      {
        session_id: '11111111-1111-1111-1111-000000000001',
        started_at: '2026-08-15T09:00:00Z',
        ended_at: '2026-08-15T09:35:00Z',
        overall_session_score: 41,
      },
      {
        session_id: '11111111-1111-1111-1111-000000000002',
        started_at: '2026-08-16T11:30:00Z',
        ended_at: '2026-08-16T12:05:00Z',
        overall_session_score: 56,
      },
      {
        session_id: '11111111-1111-1111-1111-000000000003',
        started_at: '2026-08-17T14:15:00Z',
        ended_at: '2026-08-17T14:52:00Z',
        overall_session_score: 62,
      },
      {
        session_id: '11111111-1111-1111-1111-000000000004',
        started_at: '2026-08-18T17:10:00Z',
        ended_at: '2026-08-18T17:45:00Z',
        overall_session_score: 70,
      },
    ],
  }
}

function getMockPastAnswerFeedbacks(userId: string): PastAnswerFeedback[] {
  return [
    {
      answer_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
      session_id: '11111111-1111-1111-1111-000000000001',
      question_id: '99999999-9999-9999-9999-000000000001',
      user_id: userId,
      question_text: 'How do B-tree indexes improve query performance in relational databases?',
      answer_text: 'Indexes sort data and make scans faster.',
      submitted_at: '2026-08-15T09:12:00Z',
      difficulty: 'medium',
      feedback_text:
        'Good baseline understanding, but explain selectivity, covering indexes, and write amplification trade-offs.',
      missing_keywords: ['selectivity', 'covering index', 'write amplification'],
      fused_score: 0.41,
    },
    {
      answer_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002',
      session_id: '11111111-1111-1111-1111-000000000002',
      question_id: '99999999-9999-9999-9999-000000000002',
      user_id: userId,
      question_text: 'Design a URL shortener for 100M daily active users.',
      answer_text: 'I would use hash IDs and store them in a database.',
      submitted_at: '2026-08-16T11:44:00Z',
      difficulty: 'hard',
      feedback_text:
        'Your high-level flow is correct. Go deeper on partitioning strategy, cache invalidation, and idempotency.',
      missing_keywords: ['sharding', 'cache invalidation', 'idempotency'],
      fused_score: 0.56,
    },
    {
      answer_id: 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003',
      session_id: '11111111-1111-1111-1111-000000000003',
      question_id: '99999999-9999-9999-9999-000000000003',
      user_id: userId,
      question_text: 'Why is merge sort O(n log n), and when is it preferred?',
      answer_text: 'It splits and merges arrays efficiently.',
      submitted_at: '2026-08-17T14:27:00Z',
      difficulty: 'medium',
      feedback_text:
        'Clear structure. Add memory-cost discussion and contrast with quicksort best/worst case behavior.',
      missing_keywords: ['auxiliary space', 'worst-case guarantees'],
      fused_score: 0.62,
    },
  ]
}

async function fetchDashboardSummary(userId: string): Promise<DashboardSummaryResponse> {
  if (USE_MOCK_DASHBOARD_DATA) {
    return getMockDashboardSummary(userId)
  }
  const { data } = await api.get<DashboardSummaryResponse>('/dashboard/summary')
  return data
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)
  const [pastAnswers, setPastAnswers] = useState<PastAnswerFeedback[]>([])
  const [selectedAnswerId, setSelectedAnswerId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchDashboardSummary(DEFAULT_USER_ID)
        setSummary(data)
        const answers = getMockPastAnswerFeedbacks(DEFAULT_USER_ID)
        setPastAnswers(answers)
        if (answers.length > 0) {
          setSelectedAnswerId(answers[0].answer_id)
        }
      } catch (err) {
        console.error('Failed to load dashboard summary', err)
        setError('Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const selectedAnswer = useMemo(
    () => pastAnswers.find((answer) => answer.answer_id === selectedAnswerId) ?? null,
    [pastAnswers, selectedAnswerId],
  )

  const topicChartData = useMemo(() => {
    if (!summary) return []
    return summary.topic_average_scores.map((topic) => ({
      topic: topic.topic_name,
      avgScore: Number(topic.avg_score.toFixed(2)),
      questionFrequency: topic.question_frequency,
    }))
  }, [summary])

  const scoreTimelineData = useMemo(() => {
    if (!summary) return []
    const ordered = [...summary.session_history].sort(
      (a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime(),
    )
    return ordered.map((session, index) => ({
      sessionLabel: `S${index + 1}`,
      startedAt: formatDateTime(session.started_at),
      overallScore: session.overall_session_score,
    }))
  }, [summary])

  if (loading) return <p className="text-gray-500">Loading dashboard…</p>
  if (error || !summary) return <p className="text-red-600">{error ?? 'No dashboard data available.'}</p>

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Your Dashboard</h1>
        <p className="text-sm text-gray-500">
          Personalized summary for user <span className="font-mono">{summary.user_id}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Topic-wise Average Scores</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" tick={{ fontSize: 12 }} interval={0} angle={-12} textAnchor="end" height={56} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${Math.round(Number(value))}%`} />
                <Bar dataKey="avgScore" fill="#6366f1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Score Over Time</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTimelineData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sessionLabel" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => (value === null ? '—' : `${Math.round(Number(value))}%`)}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.startedAt ?? 'Session'}
                />
                <Line type="monotone" dataKey="overallScore" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Session History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-3">Session</th>
                <th className="py-2 pr-3">Started</th>
                <th className="py-2 pr-3">Ended</th>
                <th className="py-2 pr-3">Overall Score</th>
              </tr>
            </thead>
            <tbody>
              {summary.session_history.map((session) => (
                <tr key={session.session_id} className="border-b last:border-b-0">
                  <td className="py-3 pr-3 font-mono text-xs text-gray-700">{session.session_id}</td>
                  <td className="py-3 pr-3 text-gray-600">{formatDateTime(session.started_at)}</td>
                  <td className="py-3 pr-3 text-gray-600">
                    {session.ended_at ? formatDateTime(session.ended_at) : 'In progress'}
                  </td>
                  <td className="py-3 pr-3 font-semibold text-gray-800">
                    {formatScore(session.overall_session_score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Prioritized Study Plan</h2>
        <ol className="space-y-3">
          {summary.study_plan
            .slice()
            .sort((a, b) => a.priority_rank - b.priority_rank)
            .map((item) => (
              <li key={item.topic_id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl font-bold text-indigo-300 w-8 text-center shrink-0">
                    {item.priority_rank}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.topic_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Reason: lower score ({Math.round(item.avg_score)}%) + high question frequency (
                      {item.question_frequency} questions).
                    </p>
                    <p className="text-sm text-indigo-700 mt-1">{item.recommended_focus}</p>
                  </div>
                </div>
              </li>
            ))}
        </ol>
      </section>

      <section className="bg-white rounded-2xl shadow p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Past Answer Feedback</h2>
        {pastAnswers.length === 0 ? (
          <p className="text-sm text-gray-500">No past answers available yet.</p>
        ) : (
          <>
            <label htmlFor="dashboard-answer-select" className="block text-sm font-medium text-gray-600 mb-2">
              Select an answer
            </label>
            <select
              id="dashboard-answer-select"
              value={selectedAnswerId}
              onChange={(e) => setSelectedAnswerId(e.target.value)}
              className="w-full max-w-xl border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-5"
            >
              {pastAnswers.map((answer) => (
                <option key={answer.answer_id} value={answer.answer_id}>
                  {formatDateTime(answer.submitted_at)} — {answer.question_text}
                </option>
              ))}
            </select>

            {selectedAnswer && (
              <div>
                <p className="text-sm text-gray-500 mb-3">
                  <span className="font-semibold text-gray-700">Question:</span> {selectedAnswer.question_text}
                </p>

                {selectedAnswer.feedback_text && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-4">
                    <h3 className="text-sm font-semibold text-indigo-700 mb-2">AI Feedback</h3>
                    <p className="text-sm text-gray-700">{selectedAnswer.feedback_text}</p>
                  </div>
                )}

                {selectedAnswer.missing_keywords && selectedAnswer.missing_keywords.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-amber-700 mb-2">Missing Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnswer.missing_keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
