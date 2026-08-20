import { useState } from 'react'
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
  reference_answer?: string
  source?: string
}

const ROLE_OPTIONS = [
  'Backend Engineer', 'Frontend Engineer', 'Software Engineer', 'ML Engineer',
]
const TOPIC_OPTIONS = [
  'Python / Data Structures', 'System Design', 'Behavioral & Communication',
  'Databases', 'Operating Systems', 'Algorithms',
]
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard']

const SEEN_IDS_KEY = 'prepiq_seen_question_ids'

function getSeenIds(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_IDS_KEY) || '[]') } catch { return [] }
}
function addSeenIds(ids: string[]) {
  const existing = new Set(getSeenIds())
  ids.forEach(id => existing.add(id))
  localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([...existing]))
}

type Phase = 'config' | 'active' | 'submitting'

export default function Practice() {
  const navigate = useNavigate()
  const { user, onboardingData } = useAuth()

  // Config state – pre-fill from onboarding
  const [role, setRole] = useState(onboardingData?.targetRole || 'Backend Engineer')
  const [topic, setTopic] = useState('Python / Data Structures')
  const [customTopic, setCustomTopic] = useState('')
  const [difficulty, setDifficulty] = useState('Medium')
  const [questionCount, setQuestionCount] = useState(5)

  // Session state
  const [phase, setPhase] = useState<Phase>('config')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.user_id ?? '00000000-0000-0000-0000-000000000002'
  const effectiveTopic = customTopic.trim() || topic

  const startSession = async () => {
    setFetching(true)
    setError(null)
    try {
      // Create session
      const { data: sessionData } = await api.post('/sessions', {
        user_id: userId,
        role_id: '11111111-1111-1111-1111-111111111111',
        session_type: 'practice',
      })
      const sid = sessionData.session_id
      setSessionId(sid)

      // Fetch questions with excluded IDs to avoid repeats
      const seenIds = getSeenIds()
      const { data: qs } = await api.get('/questions', {
        params: {
          role,
          topic: effectiveTopic,
          difficulty,
          count: questionCount,
          excluded_ids: JSON.stringify(seenIds),
        },
      })

      if (!qs || qs.length === 0) {
        setError('No questions found. Try different filters.')
        setFetching(false)
        return
      }

      setQuestions(qs)
      addSeenIds(qs.map((q: Question) => q.question_id))
      setCurrentIdx(0)
      setAnswers({})
      setPhase('active')
    } catch (err) {
      console.error('Failed to start practice session', err)
      setError('Failed to load questions. Please try again.')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmitAll = async () => {
    setPhase('submitting')
    const scores: any[] = []
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const answerText = answers[i]?.trim() || 'No answer provided.'
        try {
          const { data: scoreData } = await api.post(`/sessions/${sessionId}/answers`, {
            question_id: q.question_id,
            user_id: userId,
            answer_text: answerText,
            question_text: q.question_text,
            reference_answer: q.reference_answer || '',
          })
          scores.push({ score: scoreData, question: q, answerText })
        } catch {
          scores.push({ score: null, question: q, answerText })
        }
      }
      navigate('/practice/analysis', {
        state: { sessionId, scores, sessionType: 'practice' },
      })
    } catch (err) {
      console.error('Submission failed', err)
      setPhase('active')
    }
  }

  const question = questions[currentIdx]
  const allAnswered = questions.length > 0 && questions.every((_, i) => answers[i]?.trim())

  // ─── CONFIG PHASE ────────────────────────────────────────────────────────────
  if (phase === 'config') {
    return (
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>Practice Arena</h1>
          <p className={styles.subtitle}>Configure your session, then answer questions at your own pace.</p>
        </div>

        <Card variant="nohover" style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

            {/* Role */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Target Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} className={styles.select}>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Topic */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Topic</label>
              <select value={topic} onChange={e => setTopic(e.target.value)} className={styles.select}>
                {TOPIC_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                type="text"
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder="Or enter your own topic…"
                className={styles.select}
                style={{ marginTop: '8px' }}
              />
            </div>

            {/* Difficulty */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Difficulty</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {DIFFICULTY_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: `2px solid ${difficulty === d ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      background: difficulty === d ? 'rgba(160,104,255,0.12)' : 'var(--surface)',
                      color: difficulty === d ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: difficulty === d ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                Number of Questions: <strong style={{ color: 'var(--accent)' }}>{questionCount}</strong>
              </label>
              <input
                type="range"
                min={5}
                max={10}
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>5</span><span>10</span>
              </div>
            </div>

            {error && <p style={{ color: 'var(--color-error)', fontSize: '13px' }}>{error}</p>}

            <Button
              id="practice-start"
              variant="primary"
              onClick={startSession}
              disabled={fetching}
              withBorder
            >
              {fetching ? 'Loading Questions…' : `Start Session (${questionCount} Qs)`}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ─── SUBMITTING PHASE ────────────────────────────────────────────────────────
  if (phase === 'submitting') {
    return (
      <div className={styles.container} style={{ textAlign: 'center', paddingTop: '80px' }}>
        <h2 style={{ color: 'var(--accent)' }}>Scoring your answers…</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>This may take a moment. Hang tight!</p>
      </div>
    )
  }

  // ─── ACTIVE PHASE ────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.titleSection} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className={styles.title}>Practice Arena</h1>
          <p className={styles.subtitle}>{effectiveTopic} · {difficulty} · {role}</p>
        </div>
        {/* Progress indicators */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: `2px solid ${i === currentIdx ? 'var(--accent)' : answers[i]?.trim() ? 'var(--color-success)' : 'var(--border)'}`,
                background: i === currentIdx ? 'var(--accent)' : answers[i]?.trim() ? 'rgba(74,222,128,0.15)' : 'transparent',
                color: i === currentIdx ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.2s',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.workspace}>
        {/* Question panel */}
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

        {/* Answer panel */}
        <div className={styles.rightCol}>
          <textarea
            id="practice-answer-input"
            value={answers[currentIdx] || ''}
            onChange={e => setAnswers(prev => ({ ...prev, [currentIdx]: e.target.value }))}
            placeholder="Draft your answer here… Be as descriptive as possible."
            className={styles.textarea}
          />

          <div className={styles.actions}>
            <Button
              id="practice-prev"
              variant="secondary"
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
            >
              ← Prev
            </Button>

            {currentIdx < questions.length - 1 ? (
              <Button
                id="practice-next"
                variant="secondary"
                onClick={() => setCurrentIdx(i => i + 1)}
              >
                Next →
              </Button>
            ) : null}

            <Button
              id="practice-submit"
              variant="primary"
              onClick={handleSubmitAll}
              disabled={!allAnswered}
              withBorder
            >
              Submit All & Analyse
            </Button>
          </div>

          {!allAnswered && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Answer all questions to submit. ({Object.values(answers).filter(a => a?.trim()).length}/{questions.length} done)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
