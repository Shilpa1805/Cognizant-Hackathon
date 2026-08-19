import { useTypewriter } from '../hooks/useTypewriter'

interface TypewriterTextProps {
  /** Full text to reveal character by character */
  text: string
  /** Milliseconds per character (default 35) */
  speed?: number
  /** Delay before starting in ms (default 400) */
  delay?: number
  className?: string
  /** Additional static text or elements shown after reveal */
  children?: React.ReactNode
}

import React from 'react'

/**
 * TypewriterText — character-by-character reveal with blinking accent cursor.
 * LANDING PAGE ONLY — not used on any other page.
 */
export default function TypewriterText({
  text,
  speed = 35,
  delay = 400,
  className,
}: TypewriterTextProps) {
  const { displayed, done } = useTypewriter({ text, speed, delay })

  return (
    <span className={className}>
      {displayed}
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: '3px',
          height: '0.85em',
          background: 'var(--accent)',
          marginLeft: '3px',
          verticalAlign: 'middle',
          borderRadius: '1px',
          animation: done ? 'cursorBlink 1s ease-in-out infinite' : 'none',
          opacity: done ? undefined : 1,
        }}
      />
    </span>
  )
}
