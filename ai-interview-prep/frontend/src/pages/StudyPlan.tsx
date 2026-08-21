import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import { useNavigate } from 'react-router-dom'
import styles from './StudyPlan.module.css'

interface StudyPlanEntry {
  priority_rank: number
  topic_id: string
  topic_name: string
  avg_score: number
  reason: string
  recommended_resources: string[]
}

export default function StudyPlan() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<StudyPlanEntry[]>([])
  const [loading, setLoading] = useState(true)

  const userId = user?.user_id

  useEffect(() => {
    const load = async () => {
      if (!userId) return

      try {
        // Use /dashboard/summary which returns study_plan with real topic_names already resolved
        const { data } = await api.get('/dashboard/summary', {
          params: { user_id: userId },
        })
        const sorted = [...(data.study_plan ?? [])].sort(
          (a: StudyPlanEntry, b: StudyPlanEntry) => a.priority_rank - b.priority_rank,
        )
        setPlan(sorted)
      } catch (err) {
        console.error('Failed to load study plan', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className="skeleton" style={{ width: '240px', height: '40px', marginBottom: '16px' }} />
        <div className="skeleton" style={{ height: '360px' }} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Study Plan</h1>
      <p className={styles.subtitle}>
        AI-prioritised topics based on your actual performance scores. Tackle the top items first.
      </p>

      {plan.length === 0 ? (
        <Card variant="nohover" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
            No study plan data yet. Start practising to generate your personalised plan!
          </p>
          <Button variant="primary" withBorder onClick={() => navigate('/practice')}>
            Start Practising →
          </Button>
        </Card>
      ) : (
        <div className={styles.list}>
          {plan.map((item) => (
            <Card key={item.topic_id} className={styles.item} variant="nohover">
              <span className={styles.rank}>{item.priority_rank}</span>
              <div className={styles.content}>
                <h2 className={styles.topicName}>{item.topic_name}</h2>

                {/* AI-generated priority reason */}
                {item.reason && (
                  <p style={{
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-muted)',
                    marginBottom: 'var(--space-3)',
                    lineHeight: 1.5,
                  }}>
                    {item.reason}
                  </p>
                )}

                {/* Average score chip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: item.avg_score >= 75 ? 'var(--color-success)' : item.avg_score >= 55 ? 'var(--color-warning)' : 'var(--color-error)',
                    fontWeight: 600,
                  }}>
                    Current avg: {item.avg_score}%
                  </span>
                </div>

                {/* Recommended resources */}
                {item.recommended_resources && item.recommended_resources.length > 0 && (
                  <div className={styles.resourceList}>
                    {item.recommended_resources.map((r, idx) => (
                      <div key={idx} className={styles.resourceItem}>
                        {r.startsWith('http') ? (
                          <a
                            href={r}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.resourceLink}
                          >
                            🔗 {r}
                          </a>
                        ) : (
                          <span>📖 {r}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
