import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import styles from './StudyPlan.module.css'

interface StudyPlanItem {
  id: string
  topic_id: string
  priority_rank: number
  recommended_resources: string[] | null
  generated_at: string
}

const TOPIC_NAMES: Record<string, string> = {
  '22222222-2222-2222-2222-222222222222': 'Operating Systems',
  '33333333-3333-3333-3333-333333333333': 'System Design',
  '44444444-4444-4444-4444-444444444444': 'Databases',
  '55555555-5555-5555-5555-555555555555': 'Algorithms',
  '66666666-6666-6666-6666-666666666666': 'Behavioural',
}

export default function StudyPlan() {
  const { user } = useAuth()
  const [plan, setPlan] = useState<StudyPlanItem[]>([])
  const [loading, setLoading] = useState(true)

  const userId = user?.user_id ?? '00000000-0000-0000-0000-000000000002'

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/study-plan/${userId}`)
        const sorted = [...data].sort(
          (a: StudyPlanItem, b: StudyPlanItem) => a.priority_rank - b.priority_rank,
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
        Tailored priorities based on your performance ratings. Target the top items first.
      </p>

      <div className={styles.list}>
        {plan.map((item) => (
          <Card key={item.id} className={styles.item} variant="nohover">
            <span className={styles.rank}>{item.priority_rank}</span>
            <div className={styles.content}>
              <h2 className={styles.topicName}>
                {TOPIC_NAMES[item.topic_id] ?? 'Unknown Topic'}
              </h2>
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
    </div>
  )
}
