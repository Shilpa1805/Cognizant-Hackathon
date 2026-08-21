import { useState, useMemo } from 'react'
import styles from './CalibrationCard.module.css'

// ── Types ───────────────────────────────────────────────────────────────────

export interface DisagreementItem {
  question: string
  student_answer: string
  human_score: number
  fused_score: number
  score_diff: number
  source: string
}

export interface CalibrationData {
  sample_count: number
  pearson_r: number
  spearman_rho: number
  top_disagreements: DisagreementItem[]
  itemized?: DisagreementItem[]
}

// ── Pure helper — confidence-scaled human marker style ──────────────────────

interface MarkerStyle {
  opacity: number
  band: string
  flagged: boolean
}

function humanMarkerStyle(scoreDiff: number): MarkerStyle {
  if (scoreDiff >= 0.3) return { opacity: 0.25, band: 'var(--color-danger)', flagged: true }
  if (scoreDiff >= 0.15) return { opacity: 0.55, band: 'var(--color-warning)', flagged: false }
  return { opacity: 0.9, band: 'var(--color-success)', flagged: false }
}

// ── Error-margin bar ────────────────────────────────────────────────────────

function ErrorMarginBar({ item, idx }: { item: DisagreementItem; idx: number }) {
  const [expanded, setExpanded] = useState(false)
  const ms = humanMarkerStyle(item.score_diff)

  const aiPct = Math.min(100, Math.max(0, item.fused_score * 100))
  const humanPct = Math.min(100, Math.max(0, item.human_score * 100))

  const bandLeft = Math.min(aiPct, humanPct)
  const bandWidth = Math.abs(aiPct - humanPct)

  return (
    <div className={`${styles.barRow} ${ms.flagged ? styles.barRowFlagged : ''}`}>
      <div className={styles.barHeader}>
        <button
          className={styles.questionToggle}
          onClick={() => setExpanded(prev => !prev)}
          aria-expanded={expanded}
          title="Click to expand question and answer"
        >
          <span className={styles.itemNum}>#{idx + 1}</span>
          <span className={styles.questionSnippet}>
            {item.question.length > 90 ? item.question.slice(0, 90) + '…' : item.question}
          </span>
          <span className={styles.expandIcon}>{expanded ? '▲' : '▼'}</span>
        </button>
        {ms.flagged && (
          <span
            className={styles.lowConfTag}
            title="The gap between AI and human score is large — this human label is considered low-confidence ground truth"
          >
            ⚠ low-confidence human label
          </span>
        )}
      </div>

      <div className={styles.track}>
        <div
          className={styles.band}
          style={{
            left: `${bandLeft}%`,
            width: `${bandWidth}%`,
            background: ms.band,
            opacity: 0.22,
          }}
        />
        {bandWidth > 3 && (
          <div
            className={styles.deltaLabel}
            style={{ left: `${bandLeft + bandWidth / 2}%`, color: ms.band }}
          >
            Δ {item.score_diff.toFixed(2)}
          </div>
        )}
        <div
          className={styles.markerAI}
          style={{ left: `${aiPct}%` }}
          title={`AI fused score: ${item.fused_score.toFixed(2)}`}
        >
          <div className={styles.markerAIPin} />
          <span className={styles.markerAILabel}>{item.fused_score.toFixed(2)}</span>
        </div>
        <div
          className={styles.markerHuman}
          style={{ left: `${humanPct}%`, opacity: ms.opacity }}
          title={`Human score: ${item.human_score.toFixed(2)} (sanity-check label)`}
        >
          <div className={styles.markerHumanPin} style={{ borderColor: ms.band }} />
          <span className={styles.markerHumanLabel} style={{ color: ms.band }}>
            {item.human_score.toFixed(2)}
          </span>
        </div>
      </div>

      <div className={styles.scoreChips}>
        <span className={styles.chipAI}>
          🤖 AI: <strong>{item.fused_score.toFixed(2)}</strong>
        </span>
        <span className={styles.chipHuman} style={{ opacity: ms.opacity, color: ms.band }}>
          👤 Human: {item.human_score.toFixed(2)}
        </span>
        <span className={styles.chipSource}>{item.source}</span>
      </div>

      {expanded && (
        <div className={styles.expandedContext}>
          <p className={styles.contextLabel}>Question</p>
          <p className={styles.contextText}>{item.question}</p>
          <p className={styles.contextLabel} style={{ marginTop: 'var(--space-3)' }}>Student Answer</p>
          <p className={styles.contextText}>{item.student_answer}</p>
        </div>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  data: CalibrationData
}

export default function CalibrationCard({ data }: Props) {
  const source = data.itemized && data.itemized.length > 0 ? data.itemized : data.top_disagreements
  const mae = useMemo(() => {
    if (source.length === 0) return 0
    return source.reduce((acc, d) => acc + d.score_diff, 0) / source.length
  }, [source])

  const sortedItems = useMemo(
    () =>
      [...data.top_disagreements].sort((a, b) => {
        const aF = a.score_diff >= 0.3 ? 1 : 0
        const bF = b.score_diff >= 0.3 ? 1 : 0
        if (bF !== aF) return bF - aF
        return b.score_diff - a.score_diff
      }),
    [data.top_disagreements]
  )

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Model Calibration — Human Sanity Check</h2>
          <p className={styles.caption}>
            AI score is authoritative. Human score is a sanity check only — the larger the gap
            from the AI score, the less that human label is trusted as ground truth, and it does
            not affect any candidate's actual score.
          </p>
        </div>
      </div>

      <div className={styles.statStrip}>
        {[
          { label: 'Pearson r', value: data.pearson_r.toFixed(3), color: 'var(--accent)' },
          { label: 'Spearman ρ', value: data.spearman_rho.toFixed(3), color: 'var(--color-info)' },
          { label: 'Sample Count', value: String(data.sample_count), color: 'var(--text-primary)' },
          {
            label: 'Mean Abs. Error',
            value: mae.toFixed(3),
            color: mae > 0.25 ? 'var(--color-warning)' : 'var(--color-success)',
          },
        ].map(stat => (
          <div key={stat.label} className={styles.statChip}>
            <span className={styles.statValue} style={{ color: stat.color }}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendDotAI} /> AI score (authoritative)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendDotHuman} /> Human score (sanity check · fades as gap grows)
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendBand} /> Error margin band
        </span>
      </div>

      {sortedItems.length === 0 ? (
        <p className={styles.emptyMsg}>No disagreement data available.</p>
      ) : (
        <div className={styles.barList}>
          {sortedItems.map((item, idx) => (
            <ErrorMarginBar key={idx} item={item} idx={idx} />
          ))}
        </div>
      )}
    </div>
  )
}
