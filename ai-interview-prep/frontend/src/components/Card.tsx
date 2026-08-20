import React from 'react'
import styles from './Card.module.css'

type CardVariant = 'default' | 'elevated' | 'flat' | 'accent' | 'nohover'
type CardPadding = 'sm' | 'md' | 'lg'

interface CardProps {
  variant?: CardVariant
  padding?: CardPadding
  className?: string
  children: React.ReactNode
  onClick?: () => void
  style?: React.CSSProperties
}

/** PrepPilot shared Card — glass surface with hover lift. Use for all content containers. */
export default function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  onClick,
  style,
}: CardProps) {
  const classes = [
    styles.card,
    variant !== 'default' ? styles[variant] : '',
    padding === 'sm' ? styles.sm : padding === 'lg' ? styles.lg : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={classes} onClick={onClick} style={style}>
      {children}
    </div>
  )
}
