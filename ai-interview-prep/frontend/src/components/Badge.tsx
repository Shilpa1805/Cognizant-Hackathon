import React from 'react'

type BadgeVariant = 'easy' | 'medium' | 'hard' | 'accent' | 'info' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const BADGE_STYLES: Record<BadgeVariant, React.CSSProperties> = {
  easy:    { background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
  medium:  { background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' },
  hard:    { background: 'rgba(248, 113, 113, 0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' },
  accent:  { background: 'rgba(160, 104, 255, 0.15)', color: '#A068FF', border: '1px solid rgba(160,104,255,0.3)' },
  info:    { background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' },
  neutral: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' },
}

/**
 * PrepPilot shared Badge — pill label for difficulty, topics, status.
 * Color-coded by variant.
 */
export default function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        letterSpacing: '0.03em',
        textTransform: 'capitalize',
        ...BADGE_STYLES[variant],
      }}
    >
      {children}
    </span>
  )
}
