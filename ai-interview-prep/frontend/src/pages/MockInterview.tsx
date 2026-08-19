import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import styles from './MockInterview.module.css'

interface Question {
  question_id: string
  question_text: string
  difficulty: string
  topic_id: string
  role_id: string
}

export default function MockInterview() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()

  const [question, setQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(900) // 15 minutes
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  // Use persistent IDs where available
  const userId = user?.user_id ?? '00000000-0000-0000-0000-000000000002'
  const targetSessionId = id && id !== 'new' ? id : '00000000-0000-0000-0000-000000000001'

  // Fetch dynamic question via GET /questions/next
  useEffect(() => {
    const init = async () => {
      setFetching(true)
      try {
        const { data } = await api.get('/questions/next', {
          params: {
            role: 'Backend Engineer',
            topic: 'System Design',
            difficulty: 'Medium',
          },
        })
        setQuestion(data)
      } catch (err) {
        console.error('Failed to load dynamic question', err)
      } finally {
        setFetching(false)
      }
    }
    init()
  }, [])

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      handleEndSession()
      return
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins}:${s < 10 ? '0' : ''}${s}`
  }

  const handleEndSession = async () => {
    if (loading) return
    setLoading(true)
    try {
      // Post response to session answers
      const { data: scoreData } = await api.post(
        `/sessions/${targetSessionId}/answers`,
        {
          question_id: question?.question_id ?? '00000000-0000-0000-0000-000000000000',
          user_id: userId,
          answer_text: answer || 'No response provided within mock time limit.',
        },
      )
      // Navigate to feedback page
      navigate(`/feedback/${targetSessionId}`, {
        state: { score: scoreData, question }
      })
    } catch (err) {
      console.error('Failed to submit mock interview session response', err)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.roomHeader}>
        <h1 className={styles.roomTitle}>Live Mock Room</h1>
        <div className={styles.timer}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>

      {fetching ? (
        <div className="skeleton" style={{ height: '360px', width: '100%' }} />
      ) : (
        <div className={styles.workspace}>
          {/* Question panel */}
          <div className={styles.panel}>
            <Card variant="nohover" className={styles.promptCard}>
              <div>
                <span className={styles.roomTitle} style={{ fontSize: 'var(--text-lg)' }}>
                  Active Interview Prompt
                </span>
                <p className={styles.promptText} style={{ marginTop: 'var(--space-4)' }}>
                  {question?.question_text}
                </p>
              </div>
              <div className={styles.metadata}>
                <Badge variant={question?.difficulty?.toLowerCase() as any ?? 'medium'}>
                  {question?.difficulty ?? 'Medium'}
                </Badge>
                <Badge variant="accent">Technical Round</Badge>
              </div>
            </Card>
          </div>

          {/* Editor/Response panel */}
          <div className={styles.panel}>
            <div className={styles.editorWrapper}>
              <div className={styles.editorHeader}>
                <div className={styles.editorDots}>
                  <div className={styles.editorDot} style={{ background: '#f87171' }} />
                  <div className={styles.editorDot} style={{ background: '#fbbf24' }} />
                  <div className={styles.editorDot} style={{ background: '#4ade80' }} />
                </div>
                <span className={styles.editorTab}>response.md</span>
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="// Compose your answer details or mock technical thoughts..."
                className={styles.textarea}
                disabled={loading}
              />
            </div>

            <div className={styles.actions}>
              <Button
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                disabled={loading}
              >
                Quit Session
              </Button>
              <Button
                variant="primary"
                onClick={handleEndSession}
                disabled={loading}
                withBorder
              >
                {loading ? 'Submitting...' : 'End & Evaluate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
