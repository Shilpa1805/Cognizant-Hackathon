import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import styles from './Practice.module.css'

interface Question {
  question_id: string
  question_text: string
  difficulty: string
  topic_id: string
  role_id: string
}

export default function Practice() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // Filter settings
  const [role, setRole] = useState('Backend Engineer')
  const [topic, setTopic] = useState('Python / Data Structures')
  const [difficulty, setDifficulty] = useState('Medium')

  // Practice state
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  // Use persistent IDs where available
  const userId = user?.user_id ?? '00000000-0000-0000-0000-000000000002'
  const sessionId = '00000000-0000-0000-0000-000000000001'

  const loadQuestions = async () => {
    setFetching(true)
    try {
      const { data } = await api.get('/questions', {
        params: { role, topic, count: 5 },
      })
      setQuestions(data)
      setCurrentIdx(0)
      setAnswer('')
    } catch (err) {
      console.error('Failed to load questions', err)
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [role, topic])

  const handleSubmit = async () => {
    if (!answer.trim()) return
    setLoading(true)
    try {
      const q = questions[currentIdx]
      const { data: scoreData } = await api.post(
        `/sessions/${sessionId}/answers`,
        {
          question_id: q?.question_id,
          user_id: userId,
          answer_text: answer,
          // Send question context so scoring.py can run real ML comparison
          question_text: q?.question_text ?? '',
          reference_answer: (q as any)?.reference_answer ?? '',
        },
      )
      navigate(`/feedback/${sessionId}`, {
        state: { score: scoreData, question: q }
      })
    } catch (err) {
      console.error('Failed to submit answer', err)
    } finally {
      setLoading(false)
    }
  }

  const question = questions[currentIdx]

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>Practice Arena</h1>
        <p className={styles.subtitle}>Warm up with single questions and get granular scoring details.</p>
      </div>

      {/* Filters bar */}
      <div className={styles.filtersRow}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Target Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} className={styles.select}>
            <option value="Backend Engineer">Backend Engineer</option>
            <option value="Frontend Engineer">Frontend Engineer</option>
            <option value="Software Engineer">Software Engineer</option>
            <option value="ML Engineer">ML Engineer</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Topic</label>
          <select value={topic} onChange={e => setTopic(e.target.value)} className={styles.select}>
            <option value="Python / Data Structures">DSA & Python</option>
            <option value="System Design">System Design</option>
            <option value="Behavioral & Communication">Behavioral & Comm</option>
            <option value="Databases">Databases & SQL</option>
            <option value="Operating Systems">Operating Systems</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Difficulty</label>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={styles.select}>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        <Button variant="secondary" onClick={loadQuestions} size="sm" style={{ marginTop: '16px' }}>
          Refresh List
        </Button>
      </div>

      {fetching ? (
        <div style={{ padding: 'var(--space-12) 0', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: '240px', width: '100%' }} />
        </div>
      ) : questions.length === 0 ? (
        <Card variant="nohover" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No questions found. Try changing your filters.</p>
        </Card>
      ) : (
        <div className={styles.workspace}>
          {/* Question display */}
          <div className={styles.leftCol}>
            <Card variant="accent" className={styles.card}>
              <div className={styles.cardHeader}>
                <Badge variant={question?.difficulty?.toLowerCase() as any ?? 'medium'}>
                  {question?.difficulty ?? 'Medium'}
                </Badge>
                <span className={styles.subtitle}>
                  Question {currentIdx + 1} of {questions.length}
                </span>
              </div>
              <p id="practice-question-text" className={styles.questionText}>
                {question?.question_text}
              </p>
            </Card>
          </div>

          {/* Submission panel */}
          <div className={styles.rightCol}>
            <textarea
              id="practice-answer-input"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Draft your solution/response here... Be as descriptive as possible to get complete scores."
              className={styles.textarea}
              disabled={loading}
            />

            <div className={styles.actions}>
              {currentIdx < questions.length - 1 && (
                <Button
                  id="practice-next"
                  variant="secondary"
                  onClick={() => {
                    setCurrentIdx((i) => i + 1)
                    setAnswer('')
                  }}
                  disabled={loading}
                >
                  Skip →
                </Button>
              )}
              <Button
                id="practice-submit"
                variant="primary"
                onClick={handleSubmit}
                disabled={loading || !answer.trim()}
                withBorder
              >
                {loading ? 'Submitting...' : 'Submit Response'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
