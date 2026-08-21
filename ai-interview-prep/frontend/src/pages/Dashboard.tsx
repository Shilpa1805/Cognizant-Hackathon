import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import ProgressRing from '../components/ProgressRing'
import styles from './Dashboard.module.css'

interface TopicAverage {
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

interface SessionHistoryItem {
  session_id: string
  started_at: string
  ended_at: string | null
  overall_session_score: number | null
}

interface DashboardData {
  user_id: string
  topic_average_scores: TopicAverage[]
  study_plan: StudyPlanItem[]
  session_history: SessionHistoryItem[]
}

const TOPIC_COLORS = ['#A068FF', '#4ade80', '#60a5fa', '#fbbf24', '#f87171']

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const userId = user?.user_id;

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

  // Compute overall average and total answers:
  // We weight each topic's avg_score by its question_frequency to reflect true overall accuracy.
  // If no topic answers exist yet, we fall back to averaging overall_session_score from session_history.
  const topicScores = data?.topic_average_scores ?? []
  const totalAnswers = topicScores.reduce((acc, t) => acc + (t.question_frequency || 0), 0)
  
  let overallAvg = 0
  if (totalAnswers > 0) {
    const weightedSum = topicScores.reduce((acc, t) => acc + (t.avg_score * t.question_frequency), 0)
    overallAvg = Math.round(weightedSum / totalAnswers)
  } else if (data?.session_history && data.session_history.length > 0) {
    const scoredSessions = data.session_history.filter(s => s.overall_session_score != null)
    if (scoredSessions.length > 0) {
      overallAvg = Math.round(
        scoredSessions.reduce((acc, s) => acc + (s.overall_session_score ?? 0), 0) / scoredSessions.length
      )
    }
  }

  const studyPlan = data?.study_plan ?? []
  const sessionHistory = data?.session_history ?? []

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
                You have completed {totalAnswers} question{totalAnswers !== 1 ? 's' : ''} across all sessions.
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
            {topicScores.length > 0 ? (
              <div className={styles.topicsGrid}>
                {topicScores.map((tp, idx) => {
                  const color = TOPIC_COLORS[idx % TOPIC_COLORS.length]
                  return (
                    <Card key={tp.topic_id} className={styles.topicCard}>
                      <div className={styles.topicInfo}>
                        <div>
                          <span className={styles.topicName}>{tp.topic_name}</span>
                          <p className={styles.topicMeta}>
                            {tp.question_frequency} question{tp.question_frequency !== 1 ? 's' : ''}
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
                              width: `${Math.min(100, Math.max(0, tp.avg_score))}%`,
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
            ) : (
              <Card variant="nohover" style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                  No topic scores recorded yet. Complete a practice or mock interview to see your competency breakdown!
                </p>
              </Card>
            )}
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
              {studyPlan.length > 0 ? (
                <Link
                  to="/priority-plan"
                  className="toggleLink"
                  style={{ fontSize: '13px', marginTop: 'var(--space-2)', alignSelf: 'center' }}
                >
                  View Priority Plan →
                </Link>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textAlign: 'center' }}>
                  Study plan generates automatically as you complete questions.
                </p>
              )}
            </div>
          </div>

          {/* Recent sessions */}
          <div>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 'var(--space-4)' }}>
              Recent Sessions
            </h2>
            <div className={styles.mockList}>
              {sessionHistory.length > 0 ? (
                <>
                  {sessionHistory.slice(0, 4).map((s) => (
                    <div key={s.session_id} className={styles.mockItem}>
                      <div>
                        <span className={styles.mockTitle}>
                          {new Date(s.started_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <p className={styles.mockDate}>
                          {s.ended_at ? 'Completed' : 'Active / In Progress'}
                        </p>
                      </div>
                      <Badge variant={s.overall_session_score != null && s.overall_session_score >= 70 ? 'easy' : s.overall_session_score != null ? 'medium' : 'hard'}>
                        {s.overall_session_score != null ? `${Math.round(s.overall_session_score)}%` : 'In Progress'}
                      </Badge>
                    </div>
                  ))}
                  <Link
                    to="/history"
                    className="toggleLink"
                    style={{ fontSize: '13px', marginTop: 'var(--space-2)', alignSelf: 'center' }}
                  >
                    View all sessions in History →
                  </Link>
                </>
              ) : (
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
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
