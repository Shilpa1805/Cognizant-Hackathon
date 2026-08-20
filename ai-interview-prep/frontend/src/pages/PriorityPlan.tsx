import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/Button'
import styles from './PriorityPlan.module.css'
import api from '../lib/api'

interface TopicAvg {
  topic_id: string
  topic_name: string
  avg_score: number
  question_frequency: number
  last_attempted: string | null
  recent_missed_concepts: string[]
  recent_topic_scores: number[]
  recent_session_id?: string | null
  recent_answer_id?: string | null
}

function getStatusBadge(avgScore: number, recentScores: number[]) {
  const trend = recentScores.length >= 2 
    ? recentScores[recentScores.length - 1] - recentScores[0]
    : 0

  if (avgScore >= 85) return { label: '✅ Mastered', className: styles.badgeMastered }
  if (avgScore >= 70 && trend >= 0) return { label: '🟢 Solid', className: styles.badgeSolid }
  if (avgScore < 70 && trend > 0) return { label: '🟡 Building', className: styles.badgeBuilding }
  return { label: '🔴 Struggling', className: styles.badgeStruggling }
}

function timeAgo(dateString: string | null) {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  return `${Math.floor(diffInSeconds / 86400)} days ago`
}

export default function PriorityPlan() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [topics, setTopics] = useState<TopicAvg[]>([])
  const [loading, setLoading] = useState(true)

  // Gap Drill State
  const [drillTopic, setDrillTopic] = useState<TopicAvg | null>(null)
  const [drillSessionId, setDrillSessionId] = useState<string | null>(null)
  const [drillQuestion, setDrillQuestion] = useState<any>(null)
  const [drillAnswer, setDrillAnswer] = useState('')
  const [drillScore, setDrillScore] = useState<any>(null)
  const [drillLoading, setDrillLoading] = useState(false)
  const [drillCount, setDrillCount] = useState(0)

  const fetchDashboard = async () => {
    try {
      const res = await api.get(`/dashboard/summary?user_id=${user?.user_id}`)
      setTopics(res.data.topic_average_scores)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.user_id) fetchDashboard()
  }, [user?.user_id])


  const startGapDrill = async (topic: TopicAvg, overrideSessionId?: string) => {
    setDrillTopic(topic)
    setDrillLoading(true)
    setDrillScore(null)
    setDrillAnswer('')
    
    try {
      let sessionId = overrideSessionId || drillSessionId
      if (!sessionId) {
        // Create new practice session
        const sessRes = await api.post('/sessions', {
          user_id: user?.user_id,
          role_id: '11111111-1111-1111-1111-111111111111',
          session_type: 'practice'
        })
        sessionId = sessRes.data.session_id
        setDrillSessionId(sessionId)
      }

      // Fetch a new question for this topic using /questions 
      // We pass count=1 and difficulty=medium to mimic a fast gap drill
      const qRes = await api.get(`/questions?count=1&topic=${encodeURIComponent(topic.topic_name)}&difficulty=medium`)
      setDrillQuestion(qRes.data[0])
    } catch (err) {
      console.error(err)
      alert("Failed to start Gap Drill.")
      setDrillTopic(null)
    } finally {
      setDrillLoading(false)
    }
  }

  const submitGapDrillAnswer = async () => {
    if (!drillQuestion || !drillSessionId || !drillAnswer.trim()) return
    setDrillLoading(true)
    try {
      const res = await api.post(`/sessions/${drillSessionId}/answers`, {
        question_id: drillQuestion.question_id,
        user_id: user?.user_id,
        answer_text: drillAnswer,
        question_text: drillQuestion.question_text,
        reference_answer: drillQuestion.reference_answer,
        topic_text: drillTopic?.topic_name,
        difficulty: drillQuestion.difficulty
      })
      setDrillScore(res.data)
      setDrillCount(prev => prev + 1)
      await fetchDashboard() // Silently refresh background cards
    } catch (err) {
      console.error(err)
      alert("Failed to score answer.")
    } finally {
      setDrillLoading(false)
    }
  }

  const nextGapDrill = () => {
    if (drillCount >= 3) {
      // End Drill
      setDrillTopic(null)
      setDrillSessionId(null)
      setDrillCount(0)
    } else {
      startGapDrill(drillTopic!, drillSessionId!)
    }
  }

  if (loading) return <div className={styles.container}>Loading Priority Plan...</div>

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Priority Plan</h1>
        <p>Your personalized, data-driven study guide.</p>
      </header>

      {drillTopic && (
        <div className={styles.drillOverlay}>
          <div className={styles.drillModal}>
            <h2>Gap Drill: {drillTopic.topic_name}</h2>
            {drillLoading && <p>Loading...</p>}
            
            {!drillLoading && drillQuestion && !drillScore && (
              <div className={styles.drillQuestionArea}>
                <p className={styles.qText}>{drillQuestion.question_text}</p>
                <textarea 
                  value={drillAnswer}
                  onChange={e => setDrillAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className={styles.textarea}
                  rows={6}
                />
                <Button variant="primary" onClick={submitGapDrillAnswer}>Submit Answer</Button>
                <Button variant="secondary" onClick={() => setDrillTopic(null)}>Cancel Drill</Button>
              </div>
            )}

            {!drillLoading && drillScore && (
              <div className={styles.drillResultArea}>
                <h3>Score: {Math.round(drillScore.fused_score * 100)}%</h3>
                <p>{drillScore.feedback_text}</p>
                {drillCount < 3 ? (
                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                    <Button variant="primary" onClick={nextGapDrill}>Next Drill Question</Button>
                    <Button variant="secondary" onClick={() => { setDrillTopic(null); setDrillCount(0); setDrillSessionId(null) }}>Exit Drill</Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                    <Button variant="primary" onClick={() => { setDrillTopic(null); setDrillCount(0); setDrillSessionId(null) }}>Finish Drill</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.grid}>
        {topics.map(t => {
          const status = getStatusBadge(t.avg_score, t.recent_topic_scores)
          const chartData = t.recent_topic_scores.map((s, i) => ({ index: i, score: s }))
          const showGapDrill = status.label.includes('Struggling') || status.label.includes('Building')
          
          // Filter out symbols/equations from missed concepts
          const cleanConcepts = (t.recent_missed_concepts || [])
            .filter(c => c.length > 2 && /[a-zA-Z]/.test(c) && !/[=+\\\{\}\[\]]/.test(c))
            .slice(0, 3)
          return (
            <div key={t.topic_id} className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>{t.topic_name}</h3>
                <span className={status.className}>{status.label}</span>
              </div>
              
              <div className={styles.cardBody}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Average</span>
                  <span className={styles.metricValue}>{t.avg_score}%</span>
                </div>
                <div className={styles.sparkline}>
                  {chartData.length > 1 ? (
                    <ResponsiveContainer width="100%" height={40}>
                      <LineChart data={chartData}>
                        <YAxis domain={[0, 100]} hide />
                        <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className={styles.noData}>Not enough data for trend</span>
                  )}
                </div>
              </div>
              
              <div className={styles.cardFooter}>
                <span className={styles.lastAttempt}>Last practiced: {timeAgo(t.last_attempted)}</span>
                {showGapDrill && (
                  <Button size="sm" variant="primary" onClick={() => startGapDrill(t)}>Gap Drill</Button>
                )}
              </div>

              {showGapDrill && cleanConcepts.length > 0 && (
                <div className={styles.quickFix}>
                  <p className={styles.quickFixLabel}>Quick Fix Concepts:</p>
                  <div className={styles.pills}>
                    {cleanConcepts.map((c, i) => (
                      <span key={i} className={styles.pill}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
