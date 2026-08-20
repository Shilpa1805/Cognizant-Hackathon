import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Button from '../components/Button'
import styles from './History.module.css'

interface SessionItem {
  session_id: string
  session_type: 'practice' | 'mock'
  started_at: string
  ended_at: string | null
  status: string
  avg_score: number | null
  question_count: number | null
}

interface QuestionResult {
  question_id: string
  question_text: string
  your_answer: string
  reference_answer: string | null
  fused_score: number | null
  similarity_score: number | null
  feedback_text: string | null
  missing_keywords: string[] | null
  tips_and_tricks: string[] | null
}

interface SessionDetail {
  session_id: string
  overall_score: number | null
  question_results: QuestionResult[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}



export default function History() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, SessionDetail>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)

  const userId = user?.user_id ?? '00000000-0000-0000-0000-000000000002'

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/sessions', { params: { user_id: userId } })
        setSessions(data)
      } catch (err) {
        console.error('Failed to load sessions', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [userId])

  const toggleExpand = async (sessionId: string) => {
    if (expanded === sessionId) {
      setExpanded(null)
      return
    }
    setExpanded(sessionId)
    if (details[sessionId]) return  // already loaded

    setDetailLoading(sessionId)
    try {
      const { data } = await api.get(`/sessions/${sessionId}/results`)
      setDetails(prev => ({ ...prev, [sessionId]: data }))
    } catch (err) {
      console.error('Failed to load session results', err)
    } finally {
      setDetailLoading(null)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Session History</h1>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: '80px', borderRadius: '12px', marginBottom: '12px' }} />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Session History</h1>
      <p className={styles.subtitle}>All your practice and mock sessions, sorted by date.</p>

      {sessions.length === 0 ? (
        <Card variant="nohover" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No sessions yet. Start a practice or mock session to see your history here.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="secondary" as="a" href="/practice">Start Practice</Button>
            <Button variant="primary" withBorder as="a" href="/mock-interview/new">Start Mock</Button>
          </div>
        </Card>
      ) : (
        <div className={styles.list}>
          {sessions.map(s => {
            const isOpen = expanded === s.session_id
            const detail = details[s.session_id]
            const scoreVal = s.avg_score !== null ? Math.round(s.avg_score) : null

            return (
              <div key={s.session_id}>
                <Card
                  className={styles.item}
                  style={{ cursor: 'pointer', borderColor: isOpen ? 'var(--accent)' : undefined }}
                  onClick={() => toggleExpand(s.session_id)}
                >
                  <div className={styles.info}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <Badge variant={s.session_type === 'mock' ? 'hard' : 'easy'}>
                        {s.session_type === 'mock' ? '🎯 Mock' : '📝 Practice'}
                      </Badge>
                      <span className={styles.date}>{formatDate(s.started_at)}</span>
                    </div>
                    <div className={styles.stats}>
                      <span className={styles.statVal}>
                        Questions: <span style={{ color: 'var(--accent)' }}>{s.question_count ?? '—'}</span>
                      </span>
                      <span className={styles.statVal}>
                        Avg Score:{' '}
                        <span style={{ color: scoreVal !== null ? (scoreVal >= 70 ? 'var(--color-success)' : scoreVal >= 50 ? 'var(--color-warning)' : 'var(--color-error)') : 'var(--text-subtle)' }}>
                          {scoreVal !== null ? `${scoreVal}%` : '—'}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Badge variant={s.status === 'completed' ? 'easy' : 'medium'}>{s.status}</Badge>
                    <span style={{ color: 'var(--text-muted)', fontSize: '18px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </div>
                </Card>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ marginTop: '4px', padding: '0 4px' }}>
                    {detailLoading === s.session_id ? (
                      <div className="skeleton" style={{ height: '120px', borderRadius: '10px' }} />
                    ) : detail ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {detail.question_results.map((qr, idx) => {
                          const score = qr.fused_score !== null ? Math.round(qr.fused_score * 100) : null
                          const simScore = qr.similarity_score !== null ? Math.round(qr.similarity_score * 100) : null
                          return (
                            <Card key={qr.question_id} variant="nohover" style={{ padding: 'var(--space-4)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                                <div>
                                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', marginBottom: '4px', display: 'block' }}>Q{idx + 1}</span>
                                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{qr.question_text}</p>
                                </div>
                                {score !== null && (
                                  <span style={{ fontWeight: 700, fontSize: '18px', color: score >= 70 ? 'var(--color-success)' : score >= 50 ? 'var(--color-warning)' : 'var(--color-error)', flexShrink: 0 }}>
                                    {score}%
                                  </span>
                                )}
                              </div>

                              {simScore !== null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '110px' }}>Similarity</span>
                                  <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${simScore}%`, height: '100%', background: 'var(--accent)', borderRadius: '2px' }} />
                                  </div>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>{simScore}%</span>
                                </div>
                              )}

                              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                <strong>Your answer:</strong> {qr.your_answer}
                              </div>

                              {qr.reference_answer && (
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', borderLeft: '3px solid var(--color-success)', paddingLeft: '10px', marginBottom: '6px' }}>
                                  <strong style={{ color: 'var(--color-success)' }}>✅ Reference:</strong> {qr.reference_answer}
                                </div>
                              )}

                              {qr.missing_keywords && qr.missing_keywords.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Key concepts:</span>
                                  {qr.missing_keywords.map(kw => (
                                    <span key={kw} style={{ fontSize: '11px', background: 'rgba(160,104,255,0.12)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '20px' }}>{kw}</span>
                                  ))}
                                </div>
                              )}

                              {qr.tips_and_tricks && qr.tips_and_tricks.length > 0 && (
                                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <strong>⚡ Tip:</strong> {qr.tips_and_tricks[0]}
                                </div>
                              )}
                            </Card>
                          )
                        })}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px' }}>Could not load details.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
