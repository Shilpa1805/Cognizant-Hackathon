import { useLocation, useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import ProgressRing from '../components/ProgressRing'
import styles from './SessionAnalysis.module.css'

interface Score {
  score_id: string
  answer_id: string
  similarity_score: number | null
  llm_judge_score: number | null
  concept_match_score: number | null
  fused_score: number | null
  feedback_text: string | null
  missing_keywords: string[] | null
  answer_explanation: string | null
  reference_answer: string | null
  hint?: {
    connecting_keywords: string[] | null
    tips_and_tricks: string[] | null
  } | null
}

interface QuestionResult {
  score: Score | null
  question: { question_id: string; question_text: string; difficulty: string; reference_answer?: string }
  answerText: string
}

export default function SessionAnalysis() {
  const location = useLocation()
  const navigate = useNavigate()
  const { scores, sessionType } = (location.state || {}) as {
    scores: QuestionResult[]
    sessionType: 'practice' | 'mock'
  }

  if (!scores || scores.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No results available.</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')} style={{ marginTop: '16px' }}>
          ← Back to Dashboard
        </Button>
      </div>
    )
  }

  const pct = (v: number | null) => (v !== null && v !== undefined ? Math.round(v * 100) : 0)

  const validScores = scores.filter(r => r.score?.fused_score != null)
  const overallPct = validScores.length > 0
    ? Math.round(validScores.reduce((sum, r) => sum + pct(r.score!.fused_score), 0) / validScores.length)
    : 0

  const scoreColor = overallPct >= 75 ? 'var(--color-success)' : overallPct >= 50 ? 'var(--color-warning)' : 'var(--color-error)'

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {sessionType === 'mock' ? '🎯 Mock Interview Report' : '📝 Practice Session Report'}
          </h1>
          <p className={styles.subtitle}>
            {scores.length} question{scores.length !== 1 ? 's' : ''} · Full AI-powered analysis
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={() => navigate(sessionType === 'mock' ? '/mock-interview/new' : '/practice')}>
            Try Again
          </Button>
          <Button variant="primary" withBorder onClick={() => navigate('/analytics')}>
            View Analytics
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <Card variant="accent" className={styles.overallCard}>
        <ProgressRing value={overallPct} size={120} label="Score" />
        <div className={styles.overallText}>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: scoreColor }}>
            {overallPct}% Overall Score
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            {overallPct >= 75
              ? '🎉 Excellent work! You demonstrated strong understanding across the session.'
              : overallPct >= 50
              ? '👍 Good effort! Review the feedback below to improve further.'
              : '💪 Keep practicing! Focus on the missing keywords and tips provided below.'}
          </p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              ✅ Answered: {scores.length} / {scores.length}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              🏆 Best: {Math.max(...scores.map(r => pct(r.score?.fused_score ?? null)))}%
            </span>
          </div>
        </div>
      </Card>

      {/* Per-question breakdown */}
      <h2 className={styles.sectionTitle}>Question-by-Question Breakdown</h2>

      <div className={styles.questionList}>
        {scores.map((result, idx) => {
          const { score, question, answerText } = result
          const fusedPct = pct(score?.fused_score ?? null)
          const simPct = pct(score?.similarity_score ?? null)
          const ref = score?.reference_answer || question?.reference_answer || null
          const keywords = score?.hint?.connecting_keywords || score?.missing_keywords || []
          const tips = score?.hint?.tips_and_tricks || []

          return (
            <details key={idx} className={styles.questionCard} open={idx === 0}>
              <summary className={styles.questionSummary}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span className={styles.qNum}>Q{idx + 1}</span>
                  <span className={styles.qText}>{question?.question_text}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <Badge variant={question?.difficulty?.toLowerCase() as any ?? 'medium'}>
                    {question?.difficulty ?? 'Medium'}
                  </Badge>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '16px',
                      color: fusedPct >= 75 ? 'var(--color-success)' : fusedPct >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                      minWidth: '48px',
                      textAlign: 'right',
                    }}
                  >
                    {fusedPct}%
                  </span>
                </div>
              </summary>

              <div className={styles.questionDetail}>
                {/* Similarity score highlight */}
                <div className={styles.simRow}>
                  <span className={styles.simLabel}>Similarity Match</span>
                  <div className={styles.simBar}>
                    <div className={styles.simBarFill} style={{ width: `${simPct}%` }} />
                  </div>
                  <span className={styles.simVal}>{simPct}%</span>
                </div>

                {/* Your answer */}
                <div className={styles.section}>
                  <h4 className={styles.sectionLabel}>Your Answer</h4>
                  <p className={styles.answerText}>{answerText || <em>No answer provided.</em>}</p>
                </div>

                {/* Correct answer */}
                {ref && (
                  <div className={styles.section} style={{ borderLeft: '3px solid var(--color-success)', paddingLeft: '12px' }}>
                    <h4 className={styles.sectionLabel} style={{ color: 'var(--color-success)' }}>✅ Reference Answer</h4>
                    <p className={styles.answerText}>{ref}</p>
                  </div>
                )}

                {/* Explanation */}
                {score?.answer_explanation && (
                  <div className={styles.section}>
                    <h4 className={styles.sectionLabel}>💡 Explanation</h4>
                    <p className={styles.answerText}>{score.answer_explanation}</p>
                  </div>
                )}

                {/* AI Feedback */}
                {score?.feedback_text && (
                  <div className={styles.section} style={{ background: 'rgba(160,104,255,0.06)', borderRadius: '8px', padding: '12px' }}>
                    <h4 className={styles.sectionLabel}>🤖 AI Feedback</h4>
                    <p className={styles.answerText}>{score.feedback_text}</p>
                  </div>
                )}

                {/* Key hints / keywords */}
                {keywords && keywords.length > 0 && (
                  <div className={styles.section}>
                    <h4 className={styles.sectionLabel}>🔑 Key Concepts to Remember</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {keywords.map((kw: string) => (
                        <Badge key={kw} variant="medium">{kw}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips & Tricks */}
                {tips && tips.length > 0 && (
                  <div className={styles.section}>
                    <h4 className={styles.sectionLabel}>⚡ Tips & Tricks</h4>
                    <ul style={{ margin: '6px 0 0 16px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
                      {tips.map((tip: string, i: number) => <li key={i}>{tip}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
