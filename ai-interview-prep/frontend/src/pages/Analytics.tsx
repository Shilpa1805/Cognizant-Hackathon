import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import ProgressRing from '../components/ProgressRing'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import styles from './Analytics.module.css'

interface TopicAvg {
  topic_id: string
  topic_name: string
  avg_score: number
  question_frequency: number
}

interface SessionItem {
  session_id: string
  session_type: 'practice' | 'mock'
  started_at: string
  avg_score: number | null
  question_count: number | null
}

interface DashboardData {
  topic_average_scores: TopicAvg[]
  study_plan: any[]
  session_history: any[]
}

export default function Analytics() {
  const { user } = useAuth()
  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)

  const userId = user?.user_id ?? '00000000-0000-0000-0000-000000000002'

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, sessRes] = await Promise.all([
          api.get('/dashboard/summary', { params: { user_id: userId } }).catch(() => ({ data: null })),
          api.get('/sessions', { params: { user_id: userId } }).catch(() => ({ data: [] })),
        ])
        setDashData(dashRes.data)
        setSessions(sessRes.data || [])
      } catch (err) {
        console.error('Failed to load analytics', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  // ── Computed stats ──────────────────────────────────────────────────────────
  const mockSessions = useMemo(() => sessions.filter(s => s.session_type === 'mock'), [sessions])
  const practiceSessions = useMemo(() => sessions.filter(s => s.session_type === 'practice'), [sessions])

  const scoredSessions = useMemo(() => sessions.filter(s => s.avg_score !== null), [sessions])
  const avgScore = useMemo(() => {
    if (scoredSessions.length === 0) return 0
    return Math.round(scoredSessions.reduce((sum, s) => sum + (s.avg_score ?? 0), 0) / scoredSessions.length)
  }, [scoredSessions])

  const highestScore = useMemo(() => {
    if (scoredSessions.length === 0) return 0
    return Math.round(Math.max(...scoredSessions.map(s => s.avg_score ?? 0)))
  }, [scoredSessions])

  // Score over time for line chart
  const scoreTimeline = useMemo(() =>
    scoredSessions
      .slice()
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .map((s, i) => ({
        label: `S${i + 1}`,
        date: new Date(s.started_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: Math.round(s.avg_score ?? 0),
        type: s.session_type,
      })),
    [scoredSessions]
  )

  // Topics from dashboard — split into strengths and weaknesses
  const topicSummaries = dashData?.topic_average_scores ?? []
  const strengths = topicSummaries.filter(t => t.avg_score >= 60)
  const weaknesses = topicSummaries.filter(t => t.avg_score < 60)

  if (loading) {
    return (
      <div className={styles.container}>
        <div className="skeleton" style={{ width: '280px', height: '40px', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '200px', marginBottom: '20px' }} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics</h1>
        <p className={styles.subtitle}>Track your growth across practice and mock sessions.</p>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Mock Sessions', value: mockSessions.length, icon: '🎯', color: 'var(--color-error)' },
          { label: 'Practice Sessions', value: practiceSessions.length, icon: '📝', color: 'var(--color-success)' },
          { label: 'Avg Score', value: `${avgScore}%`, icon: '📊', color: 'var(--accent)' },
          { label: 'Highest Score', value: `${highestScore}%`, icon: '🏆', color: 'var(--color-warning)' },
        ].map(stat => (
          <Card key={stat.label} variant="nohover" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>{stat.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* ── Score over time ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className={styles.sectionTitle}>Score Over Time</h2>
        {scoreTimeline.length <= 1 ? (
          <Card variant="nohover" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📈</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              {scoreTimeline.length === 0
                ? "No sessions scored yet. Complete a practice or mock session to see your progress here!"
                : "Complete one more session to see your score trend line!"}
            </p>
          </Card>
        ) : (
          <Card variant="nohover" style={{ padding: 'var(--space-5)' }}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={scoreTimeline} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} unit="%" />
                <Tooltip
                  formatter={(value: any) => [`${value}%`, 'Score']}
                  contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--accent)"
                  strokeWidth={3}
                  dot={{ fill: 'var(--accent)', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* ── Strengths & Weaknesses ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Strengths ≥ 60% */}
        <div>
          <h2 className={styles.sectionTitle} style={{ color: 'var(--color-success)' }}>💪 Strengths (≥ 60%)</h2>
          <Card variant="nohover" style={{ padding: 'var(--space-4)' }}>
            {strengths.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Keep practicing to build strengths!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {strengths.map(t => (
                  <div key={t.topic_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{t.topic_name}</span>
                    <div style={{ width: '80px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${t.avg_score}%`, height: '100%', background: 'var(--color-success)', borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)', minWidth: '36px', textAlign: 'right' }}>{Math.round(t.avg_score)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Weaknesses < 60% */}
        <div>
          <h2 className={styles.sectionTitle} style={{ color: 'var(--color-error)' }}>⚠️ Needs Work (&lt; 60%)</h2>
          <Card variant="nohover" style={{ padding: 'var(--space-4)' }}>
            {weaknesses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Great job! No weak areas detected.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {weaknesses.map(t => (
                  <div key={t.topic_id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{t.topic_name}</span>
                    <div style={{ width: '80px', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${t.avg_score}%`, height: '100%', background: 'var(--color-error)', borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-error)', minWidth: '36px', textAlign: 'right' }}>{Math.round(t.avg_score)}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Skill Competency Rings ─────────────────────────────────────────────── */}
      {topicSummaries.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Skill Competency Matrix</h2>
          <div className={styles.competencyGrid}>
            {topicSummaries.map(tp => (
              <Card key={tp.topic_id} className={styles.radarCard} variant="accent">
                <ProgressRing value={tp.avg_score} size={100} label="" />
                <span className={styles.radarLabel}>{tp.topic_name}</span>
                <span className={styles.radarCount}>{Math.round(tp.avg_score)}% avg</span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
