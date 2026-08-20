import Card from '../components/Card'
import Badge from '../components/Badge'
import styles from './History.module.css'

const MOCK_SESSIONS = [
  {
    session_id: 'sess-001',
    role: 'Software Engineer',
    started_at: '2026-08-15T10:00:00Z',
    ended_at: '2026-08-15T10:35:00Z',
    status: 'completed',
    question_count: 5,
    avg_score: 0.74,
  },
  {
    session_id: 'sess-002',
    role: 'Software Engineer',
    started_at: '2026-08-14T15:20:00Z',
    ended_at: '2026-08-14T15:48:00Z',
    status: 'completed',
    question_count: 4,
    avg_score: 0.61,
  },
  {
    session_id: 'sess-003',
    role: 'Software Engineer',
    started_at: '2026-08-16T09:10:00Z',
    ended_at: null,
    status: 'active',
    question_count: 2,
    avg_score: null,
  },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function History() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Session History</h1>
      <p className={styles.subtitle}>Review your historical mock attempts and evaluations.</p>

      <div className={styles.list}>
        {MOCK_SESSIONS.map((s) => (
          <Card key={s.session_id} className={styles.item}>
            <div className={styles.info}>
              <span className={styles.roleName}>{s.role}</span>
              <span className={styles.date}>{formatDate(s.started_at)}</span>
              <div className={styles.stats} style={{ marginTop: 'var(--space-2)' }}>
                <span className={styles.statVal}>
                  Questions: <span style={{ color: 'var(--accent)' }}>{s.question_count}</span>
                </span>
                <span className={styles.statVal}>
                  Avg Rating:{' '}
                  <span style={{ color: s.avg_score !== null ? 'var(--color-success)' : 'var(--text-subtle)' }}>
                    {s.avg_score !== null ? `${Math.round(s.avg_score * 100)}%` : '—'}
                  </span>
                </span>
              </div>
            </div>

            <Badge variant={s.status === 'completed' ? 'easy' : 'medium'}>
              {s.status}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  )
}
