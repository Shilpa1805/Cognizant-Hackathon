import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import ProgressRing from '../components/ProgressRing'
import styles from './Analytics.module.css'

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

interface SummaryData {
  overall_avg_score: number
  total_answers: number
  topic_summaries: TopicSummary[]
}

export default function Analytics() {
  const { user } = useAuth()
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  const userId = user?.user_id ?? '00000000-0000-0000-0000-000000000002'

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await api.get('/dashboard/summary', {
          params: { user_id: userId },
        })
        setData(res)
      } catch (err) {
        console.error('Failed to load analytics summary data', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className="skeleton" style={{ width: '280px', height: '40px', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '320px', marginBottom: '32px' }} />
      </div>
    )
  }

  const topicSummaries = data?.topic_summaries ?? []

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Longitudinal Analytics</h1>
        <p className={styles.subtitle}>
          Track your average performance ratings across key competency dimensions.
        </p>
      </div>

      {/* Grid of competency rings acting as a visual skill-radar */}
      <h2 className={styles.sectionTitle}>Skill Competency Matrix</h2>
      <div className={styles.competencyGrid}>
        {topicSummaries.map((tp) => (
          <Card key={tp.topic_id} className={styles.radarCard} variant="accent">
            <ProgressRing value={tp.avg_score} size={110} label="" />
            <span className={styles.radarLabel}>{tp.topic_name}</span>
            <span className={styles.radarCount}>
              {tp.attempts_count} attempt{tp.attempts_count !== 1 ? 's' : ''}
            </span>
          </Card>
        ))}
      </div>

      <div className={styles.grid}>
        {/* Left Side: Summary Metrics */}
        <div>
          <h2 className={styles.sectionTitle}>Performance Highlights</h2>
          <Card variant="nohover" className={styles.chartCard}>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>Overall Average Rating</span>
              <span className={styles.progressVal}>{data?.overall_avg_score ?? 0}%</span>
            </div>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>Total Practice Exercises</span>
              <span className={styles.progressVal}>{data?.total_answers ?? 0}</span>
            </div>
            <div className={styles.progressItem}>
              <span className={styles.progressLabel}>Completed Competency Clusters</span>
              <span className={styles.progressVal}>
                {topicSummaries.filter((t) => t.attempts_count > 0).length} / {topicSummaries.length}
              </span>
            </div>
          </Card>
        </div>

        {/* Right Side: Priority Action List */}
        <div>
          <h2 className={styles.sectionTitle}>Growth Priority List</h2>
          <Card variant="nohover" className={styles.chartCard}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {topicSummaries
                .slice()
                .sort((a, b) => b.priority_score - a.priority_score)
                .slice(0, 4)
                .map((tp, idx) => (
                  <div key={tp.topic_id} className={styles.progressItem}>
                    <span className={styles.progressLabel}>
                      {idx + 1}. {tp.topic_name}
                    </span>
                    <span className={styles.progressVal} style={{ color: 'var(--color-warning)' }}>
                      Priority Score: {Math.round(tp.priority_score)}
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
