import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import styles from './MockInterview.module.css'

const MOCK_TIME_PER_Q = 7 * 60  // 7 minutes per question in seconds

interface Question {
  question_id: string
  question_text: string
  difficulty: string
  topic_id: string
  role_id: string
  reference_answer?: string
}

const ROLE_OPTIONS = [
  'Backend Engineer', 'Frontend Engineer', 'Software Engineer', 'ML Engineer',
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

export default function MockInterview() {
  const navigate = useNavigate()
  const { user, onboardingData } = useAuth()

  // Config state
  const [role, setRole] = useState(onboardingData?.targetRole || 'Backend Engineer')
  const [topic, setTopic] = useState('System Design')
  const [customTopic, setCustomTopic] = useState('')
  const [difficulty, setDifficulty] = useState('Medium')
  const [questionCount, setQuestionCount] = useState(5)
  const [topicOptions, setTopicOptions] = useState<string[]>([
    'Python / Data Structures', 'System Design', 'Behavioral & Communication',
    'Databases', 'Operating Systems', 'Algorithms',
  ])

  // Fetch available topics from ChromaDB on mount
  useEffect(() => {
    api.get('/questions/topics')
      .then(res => { if (res.data?.length) setTopicOptions(res.data) })
      .catch(() => {}) // silently keep defaults on failure
  }, [])


  // Session state
  const [phase, setPhase] = useState<Phase>('config')
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [locked, setLocked] = useState<Set<number>>(new Set())  // locked after auto-submit
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(MOCK_TIME_PER_Q)

  const autoAdvanceRef = useRef(false)  // prevent double-trigger
  const userId = user?.user_id ?? '00000000-0000-0000-0000-000000000002'
  const effectiveTopic = customTopic.trim() || topic
  const ACTIVE_MOCK_KEY = 'prepiq_active_mock_session'

  // Restore active mock session on mount if one was saved and is still active in DB
  useEffect(() => {
    const restoreSession = async () => {
      const saved = localStorage.getItem(ACTIVE_MOCK_KEY)
      if (!saved) return
      try {
        const parsed = JSON.parse(saved)
        if (!parsed.sessionId || !parsed.questions || parsed.questions.length === 0) return

        // Verify session status with backend
        try {
          const { data: sessionInfo } = await api.get(`/sessions/${parsed.sessionId}/results`)
          if (sessionInfo && sessionInfo.status === 'completed') {
            localStorage.removeItem(ACTIVE_MOCK_KEY)
            return
          }
        } catch {
          localStorage.removeItem(ACTIVE_MOCK_KEY)
          return
        }

        // Note: Per requirements, per-question countdown timer restarts fresh on restore for simplicity
        setSessionId(parsed.sessionId)
        setQuestions(parsed.questions)
        setCurrentIdx(parsed.currentIdx ?? 0)
        setAnswers(parsed.answers ?? {})
        setLocked(new Set(parsed.locked ?? []))
        if (parsed.role) setRole(parsed.role)
        if (parsed.topic) setTopic(parsed.topic)
        if (parsed.difficulty) setDifficulty(parsed.difficulty)
        setPhase('active')
      } catch (err) {
        console.warn('Failed to restore active mock session', err)
        localStorage.removeItem(ACTIVE_MOCK_KEY)
      }
    }
    restoreSession()
  }, [])

  // Persist minimal active session state to localStorage as user progresses
  useEffect(() => {
    if (phase === 'active' && sessionId && questions.length > 0) {
      const payload = {
        sessionId,
        questions,
        currentIdx,
        answers,
        locked: Array.from(locked),
        role,
        topic: effectiveTopic,
        difficulty,
      }
      localStorage.setItem(ACTIVE_MOCK_KEY, JSON.stringify(payload))
    }
  }, [phase, sessionId, questions, currentIdx, answers, locked, role, effectiveTopic, difficulty])

  // Per-question timer: reset when question changes
  useEffect(() => {
    if (phase !== 'active') return
    setTimeLeft(MOCK_TIME_PER_Q)
    autoAdvanceRef.current = false
  }, [currentIdx, phase])

  // Countdown
  useEffect(() => {
    if (phase !== 'active') return
    if (timeLeft <= 0) {
      if (!autoAdvanceRef.current) {
        autoAdvanceRef.current = true
        handleAutoAdvance()
      }
      return
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, phase])

  const handleAutoAdvance = () => {
    // Lock current question and move to next (or submit if last)
    setLocked(prev => new Set([...prev, currentIdx]))
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      submitAll()
    }
  }

  const handleManualNext = () => {
    setLocked(prev => new Set([...prev, currentIdx]))
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1)
    } else {
      submitAll()
    }
  }

  const startSession = async () => {
    setFetching(true)
    setError(null)
    try {
      const { data: sessionData } = await api.post('/sessions', {
        user_id: userId,
        role_id: '11111111-1111-1111-1111-111111111111',
        session_type: 'mock',
      })
      setSessionId(sessionData.session_id)

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
      setLocked(new Set())
      setPhase('active')
    } catch (err) {
      console.error('Failed to start mock session', err)
      setError('Failed to load questions. Please try again.')
    } finally {
      setFetching(false)
    }
  }

  const submitAll = async () => {
    setPhase('submitting')
    const scores: any[] = []
    try {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const answerText = answers[i]?.trim() || 'No answer provided (time ran out).'
        try {
          const { data: scoreData } = await api.post(`/sessions/${sessionId}/answers`, {
            question_id: q.question_id,
            user_id: userId,
            answer_text: answerText,
            question_text: q.question_text,
            reference_answer: q.reference_answer || '',
            topic_text: effectiveTopic,
            difficulty: difficulty,
            expected_question_count: questions.length,
          })
          scores.push({ score: scoreData, question: q, answerText })
        } catch {
          scores.push({ score: null, question: q, answerText })
        }
      }
      localStorage.removeItem(ACTIVE_MOCK_KEY)
      navigate('/mock/analysis', {
        state: { sessionId, scores, sessionType: 'mock' },
      })
    } catch (err) {
      console.error('Submission failed', err)
      setPhase('active')
    }
  }

  const handleAbandon = () => {
    localStorage.removeItem(ACTIVE_MOCK_KEY)
    setPhase('config')
    setSessionId(null)
    setQuestions([])
    setAnswers({})
    setCurrentIdx(0)
    setLocked(new Set())
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const isCurrentLocked = locked.has(currentIdx)
  const question = questions[currentIdx]
  const isLastQuestion = currentIdx === questions.length - 1

  // ─── CONFIG PHASE ────────────────────────────────────────────────────────────
  if (phase === 'config') {
    return (
      <div className={styles.container}>
        <div className={styles.roomHeader}>
          <h1 className={styles.roomTitle}>Mock Interview Setup</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            ⏱️ 7 minutes per question · No going back after submission
          </p>
        </div>

        <Card variant="nohover" style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--space-8)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

            {/* Role is automatically set from onboarding profile */}

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Topic</label>
              <select value={topic} onChange={e => setTopic(e.target.value)} className={styles.select}>
                {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
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

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Difficulty</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {DIFFICULTY_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    style={{
                      flex: 1, padding: '8px',
                      border: `2px solid ${difficulty === d ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '8px',
                      background: difficulty === d ? 'rgba(160,104,255,0.12)' : 'var(--surface)',
                      color: difficulty === d ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: difficulty === d ? 600 : 400,
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Number of Questions: <strong style={{ color: 'var(--accent)' }}>{questionCount}</strong>
              </label>
              <input
                type="range" min={5} max={10} value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>5</span><span>10</span>
              </div>
            </div>

            {error && <p style={{ color: 'var(--color-error)', fontSize: '13px' }}>{error}</p>}

            <Button
              id="mock-start"
              variant="primary"
              onClick={startSession}
              disabled={fetching}
              withBorder
            >
              {fetching ? 'Loading Questions…' : `Start Mock Interview (${questionCount} Qs · 7 min each)`}
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
        <h2 style={{ color: 'var(--accent)' }}>Analysing your interview…</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Running AI scoring on all responses. Please wait.</p>
      </div>
    )
  }

  // ─── ACTIVE PHASE ────────────────────────────────────────────────────────────
  const timerPct = (timeLeft / MOCK_TIME_PER_Q) * 100
  const timerColor = timerPct > 50 ? '#4ade80' : timerPct > 20 ? '#fbbf24' : '#f87171'

  return (
    <div className={styles.container}>
      <div className={styles.roomHeader}>
        <div>
          <h1 className={styles.roomTitle}>Live Mock Interview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Question {currentIdx + 1} of {questions.length} · {effectiveTopic} · {difficulty}
          </p>
        </div>
        <div style={{ display: 'flex', align: 'center', gap: '12px', alignItems: 'center' }}>
          {/* Q progress dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {questions.map((_, i) => (
              <div
                key={i}
                style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: locked.has(i)
                    ? 'var(--color-success)'
                    : i === currentIdx
                    ? 'var(--accent)'
                    : 'var(--border)',
                }}
              />
            ))}
          </div>
          {/* Timer */}
          <div className={styles.timer} style={{ color: timerColor, borderColor: timerColor }}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {isCurrentLocked && (
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid var(--color-success)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', color: 'var(--color-success)', marginBottom: 'var(--space-4)' }}>
          ✅ This question has been submitted and is locked.
        </div>
      )}

      <div className={styles.workspace}>
        {/* Question panel */}
        <div className={styles.panel}>
          <Card variant="nohover" className={styles.promptCard}>
            <div>
              <span className={styles.roomTitle} style={{ fontSize: 'var(--text-lg)' }}>
                Interview Prompt
              </span>
              <p className={styles.promptText} style={{ marginTop: 'var(--space-4)' }}>
                {question?.question_text}
              </p>
            </div>
            <div className={styles.metadata}>
              <Badge variant={question?.difficulty?.toLowerCase() as any ?? 'medium'}>
                {question?.difficulty ?? 'Medium'}
              </Badge>
              <Badge variant="accent">Mock Round</Badge>
            </div>
          </Card>
        </div>

        {/* Answer panel */}
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
              value={answers[currentIdx] || ''}
              onChange={e => {
                if (!isCurrentLocked) {
                  setAnswers(prev => ({ ...prev, [currentIdx]: e.target.value }))
                }
              }}
              placeholder={isCurrentLocked ? 'This question is locked.' : '// Compose your answer here…'}
              className={styles.textarea}
              disabled={isCurrentLocked}
            />
          </div>

          <div className={styles.actions}>
            <Button
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Quit
            </Button>
            {/* Previous is LOCKED in mock mode */}
            <Button
              variant="secondary"
              disabled={true}
              style={{ opacity: 0.4, cursor: 'not-allowed' }}
              title="You cannot go back in mock mode"
            >
              ← Prev (Locked)
            </Button>
            <Button
              id="mock-next"
              variant="primary"
              onClick={handleManualNext}
              withBorder
            >
              {isLastQuestion ? 'Submit & Analyse' : 'Next Question →'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
