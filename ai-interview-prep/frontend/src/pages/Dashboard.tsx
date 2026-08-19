import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import ProgressRing from '../components/ProgressRing'
import styles from './Dashboard.module.css'

interface TopicSummary {
  topic_id: string
  topic_name: string
  category: string
  avg_score: number
  attempts_count: number
  question_frequency: number
  priority_score: number
  priority_rank: number
}

interface DashboardData {
  user_id: string
  overall_avg_score: number
  total_answers: number
  topic_summaries: TopicSummary[]
  study_plan: Array<{
    priority_rank: number
    topic_id: string
    topic_name: string
    avg_score: number
    reason: string
  }>
}

const TOPIC_COLORS = ['#A068FF', '#4ade80', '#60a5fa', '#fbbf24', '#f87171']

// Stub/Mock for recent/upcoming mock interviews
const RECENT_INTERVIEWS = [
  { id: 'sess-001', role: 'Software Engineer', date: 'Yesterday', score: '74%' },
  { id: 'sess-002', role: 'Backend Engineer', date: '3 days ago', score: '61%' },
]

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

  const overallAvg = data?.overall_avg_score ?? 0
  const topicProgress = data?.topic_summaries ?? []
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
                You have completed {data?.total_answers ?? 0} topic answers.
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
                          {tp.attempts_count} attempt{tp.attempts_count !== 1 ? 's' : ''}
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
                    <p className={styles.priorityReason}>{item.reason}</p>
                  </div>
                </div>
              ))}
              {studyPlan.length > 0 && (
                <Link
                  to="/study-plan"
                  className="toggleLink"
                  style={{ fontSize: '13px', marginTop: 'var(--space-2)', alignSelf: 'center' }}
                >
                  View full resources & study plan →
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
              {RECENT_INTERVIEWS.map((m) => (
                <div key={m.id} className={styles.mockItem}>
                  <div>
                    <span className={styles.mockTitle}>{m.role}</span>
                    <p className={styles.mockDate}>{m.date}</p>
                  </div>
                  <Badge variant="accent">{m.score}</Badge>
                </div>
              ))}
              <Link
                to="/history"
                className="toggleLink"
                style={{ fontSize: '13px', marginTop: 'var(--space-2)', alignSelf: 'center' }}
              >
                View all sessions →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
