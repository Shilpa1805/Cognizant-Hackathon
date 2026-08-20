import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import ProgressRing from '../components/ProgressRing'
import styles from './Dashboard.module.css'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface TopicAvg {
  topic_id: string
  topic_name: string
  avg_score: number
  question_frequency: number
}

interface StudyPlanItem {
  topic_id: string
  topic_name: string
  priority_rank: number
  recommended_focus: string
  avg_score: number
  question_frequency: number
}

interface SessionHistory {
  session_id: string
  started_at: string
  ended_at: string | null
  overall_session_score: number | null
}

interface DashboardData {
  user_id: string
  topic_average_scores: TopicAvg[]
  study_plan: StudyPlanItem[]
  session_history: SessionHistory[]
}

const TOPIC_COLORS = ['#A068FF', '#4ade80', '#60a5fa', '#fbbf24', '#f87171']

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Use fallback user UUID if none is available in auth (should not happen if protected)
  const userId = user?.user_id ?? '00000000-0000-0000-0000-000000000002'

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await api.get('/dashboard/summary', {
          params: { user_id: userId }
        })
        setData(res)
      } catch (err) {
        console.error('Failed to load dashboard summary', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.welcomeSection}>
          <div className="skeleton" style={{ width: '300px', height: '40px' }} />
        </div>
        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <div className="skeleton" style={{ height: '160px' }} />
            <div className="skeleton" style={{ height: '300px' }} />
          </div>
          <div className={styles.sideCol}>
            <div className="skeleton" style={{ height: '240px' }} />
          </div>
        </div>
      </div>
    )
  }

  const validSessions = data?.session_history?.filter(s => s.overall_session_score !== null) || []
  const overallAvg = validSessions.length > 0
    ? Math.round(validSessions.reduce((acc, s) => acc + (s.overall_session_score || 0), 0) / validSessions.length)
    : 0
  const totalAnswers = data?.topic_average_scores?.reduce((acc, t) => acc + (t.question_frequency || 0), 0) ?? 0

  const topicProgress = data?.topic_average_scores ?? []
  const studyPlan = data?.study_plan ?? []

  return (
    <div className={styles.container}>
      {/* Welcome header */}
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeText}>
          <h1>Welcome, {user?.name ?? 'Pilot'}</h1>
          <p>Let's ace your upcoming interviews. Here's your status today.</p>
        </div>
        <div className={styles.topActions}>
          <Button
            as="a"
            href="/practice"
            variant="secondary"
            id="dash-practice-btn"
          >
            Practice Qs
          </Button>
          <Button
            as="a"
            href="/mock-interview/new"
            variant="primary"
            withBorder
            id="dash-interview-btn"
          >
            Start Mock Session
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Main 2-column contents */}
        <div className={styles.mainCol}>
          
          {/* Overview summary */}
          <Card className={styles.overviewCard} variant="accent" padding="lg">
            <ProgressRing value={overallAvg} size={110} label="Score" />
            <div className={styles.overviewText}>
              <h2 className={styles.overviewTitle}>Overall Preparedness</h2>
              <p className={styles.overviewDesc}>
                You have completed {totalAnswers} topic answers.
                Your current weighted average score is {overallAvg}%. Keep practicing
                your lowest-scoring modules to rank up your rating.
              </p>
            </div>
          </Card>

          {/* Topic-wise breakdown */}
          <div>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Topics & Competencies</h2>
              <Link to="/analytics" className="toggleLink" style={{ fontSize: '13px' }}>
                View detailed charts →
              </Link>
            </div>
            <div className={styles.topicsGrid}>
              {topicProgress.map((tp, idx) => {
                const color = TOPIC_COLORS[idx % TOPIC_COLORS.length]
                return (
                  <Card key={tp.topic_id} className={styles.topicCard}>
                    <div className={styles.topicInfo}>
                      <div>
                        <span className={styles.topicName}>{tp.topic_name}</span>
                        <p className={styles.topicMeta}>
                          {tp.question_frequency} attempt{tp.question_frequency !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Badge variant={tp.avg_score >= 75 ? 'easy' : tp.avg_score >= 55 ? 'medium' : 'hard'}>
                        {tp.avg_score >= 75 ? 'Strong' : tp.avg_score >= 55 ? 'Medium' : 'Weak'}
                      </Badge>
                    </div>

                    <div className={styles.progressContainer}>
                      <div className={styles.progressBarBg}>
                        <div
                          className={styles.progressBarFill}
                          style={{
                            width: `${tp.avg_score}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <span className={styles.progressLabel}>{Math.round(tp.avg_score)}%</span>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

        </div>

        {/* Sidebar content */}
        <div className={styles.sideCol}>
          
          {/* Recommended study priority */}
          <div>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-4)' }}>
              Priority Focus Areas
            </h2>
            <div className={styles.priorityList}>
              {studyPlan.slice(0, 3).map((item) => (
                <div key={item.topic_id} className={styles.priorityItem}>
                  <span className={styles.priorityNum}>#{item.priority_rank}</span>
                  <div style={{ flex: 1 }}>
                    <span className={styles.priorityName}>{item.topic_name}</span>
                    <p className={styles.priorityReason}>{item.recommended_focus}</p>
                  </div>
                </div>
              ))}
              {studyPlan.length > 0 && (
                <Link
                  to="/priority-plan"
                  className="toggleLink"
                  style={{ fontSize: '13px', marginTop: 'var(--space-2)', alignSelf: 'center' }}
                >
                  View Priority Plan →
                </Link>
              )}
            </div>
          </div>

          {/* Recent sessions */}
          <div>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-4)' }}>
              Recent Sessions
            </h2>
            <div className={styles.mockList}>
              {(!data?.session_history || data.session_history.length === 0) ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>
                    No sessions recorded yet.
                  </p>
                  <Link
                    to="/mock-interview/new"
                    style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}
                  >
                    Start your first mock interview →
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.session_history.slice(0, 4).map(session => (
                    <Card key={session.session_id} variant="nohover" style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                            {formatDate(session.started_at)}
                          </p>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {session.ended_at ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                        {session.overall_session_score !== null && (
                          <Badge variant={session.overall_session_score >= 70 ? 'easy' : session.overall_session_score >= 50 ? 'medium' : 'hard'}>
                            {Math.round(session.overall_session_score)}%
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                  <Link
                    to="/history"
                    className="toggleLink"
                    style={{ fontSize: '13px', marginTop: 'var(--space-2)', alignSelf: 'center', display: 'block', textAlign: 'center' }}
                  >
                    View all history →
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
