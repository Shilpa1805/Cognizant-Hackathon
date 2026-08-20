import { useLocation, useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import ProgressRing from '../components/ProgressRing'
import styles from './Feedback.module.css'

interface Score {
  score_id: string
  answer_id: string
  similarity_score: number | null
  llm_judge_score: number | null
  concept_match_score: number | null
  fused_score: number | null
  feedback_text: string | null
  missing_keywords: string[] | null
}

interface Question {
  question_text: string
  difficulty: string
}

export default function Feedback() {
  const location = useLocation()
  const navigate = useNavigate()
  const score = location.state?.score as Score | undefined
  const question = location.state?.question as Question | undefined

  if (!score) {
    return (
      <div className={styles.container}>
        <Card variant="nohover" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No feedback data available.</p>
          <Button
            id="feedback-back"
            onClick={() => navigate('/practice')}
            variant="secondary"
            style={{ marginTop: 'var(--space-6)' }}
          >
            ← Back to Practice
          </Button>
        </Card>
      </div>
    )
  }

  const pctValue = (v: number | null) => (v !== null ? Math.round(v * 100) : 0)

  const scoreRows = [
    { label: 'Similarity Score', value: score.similarity_score },
    { label: 'LLM Judge Score', value: score.llm_judge_score },
    { label: 'Concept Match Score', value: score.concept_match_score },
  ]

  const fusedPct = pctValue(score.fused_score)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>AI Evaluation Report</h1>
        {question && (
          <p className={styles.subtitle}>
            Prompt: <em>{question.question_text}</em>
          </p>
        )}
      </div>

      <div className={styles.grid}>
        {/* Left Column: Scores & Key metrics */}
        <div className={styles.leftCol}>
          <Card variant="accent" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
            <ProgressRing value={fusedPct} size={110} label="Fused" />
            <div>
              <h2 className={styles.sectionTitle} style={{ marginBottom: '2px' }}>
                Fused Evaluation Score
              </h2>
              <p className={styles.subtitle}>
                Weighted blend of similarity, LLM grading, and concept match checks.
              </p>
            </div>
          </Card>

          <Card variant="nohover">
            <h2 className={styles.sectionTitle}>Breakdown Metrics</h2>
            <div className={styles.scoreRows}>
              {scoreRows.map(({ label, value }) => {
                const pct = pctValue(value)
                return (
                  <div key={label} className={styles.scoreRow}>
                    <span className={styles.scoreLabel}>{label}</span>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBarBg}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className={styles.scoreVal}>{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: AI Feedback & Keywords */}
        <div className={styles.rightCol}>
          {score.feedback_text && (
            <div className={styles.feedbackBlock}>
              <h2 className={styles.sectionTitle} style={{ color: 'var(--accent)', fontSize: 'var(--text-base)' }}>
                Detailed AI Feedback
              </h2>
              <p id="feedback-text" className={styles.feedbackText} style={{ marginTop: 'var(--space-2)' }}>
                {score.feedback_text}
              </p>
            </div>
          )}

          {score.missing_keywords && score.missing_keywords.length > 0 && (
            <Card variant="nohover">
              <h2 className={styles.sectionTitle} style={{ fontSize: 'var(--text-base)' }}>
                Recommended Keyword Focus
              </h2>
              <p className={styles.subtitle} style={{ marginBottom: 'var(--space-4)' }}>
                Integrating these keywords or subjects can help improve your scores:
              </p>
              <div className={styles.keywordsWrap}>
                {score.missing_keywords.map((kw) => (
                  <Badge key={kw} variant="medium">
                    {kw}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          id="feedback-practice-again"
          onClick={() => navigate('/practice')}
          variant="secondary"
        >
          Practice Arena
        </Button>
        <Button
          onClick={() => navigate('/analytics')}
          variant="primary"
          withBorder
        >
          View Analytics
        </Button>
      </div>
    </div>
  )
}
