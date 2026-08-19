import React from 'react'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  as?: 'button' | 'a'
  href?: string
  icon?: React.ReactNode
  withBorder?: boolean
  children: React.ReactNode
}

/**
 * PrepPilot shared Button.
 * Two canonical variants: primary (white fill) and secondary (outline).
 * Optional animated conic-gradient border ring via withBorder prop.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  as: Tag = 'button',
  href,
  icon,
  withBorder = false,
  children,
  className,
  ...rest
}: ButtonProps) {
  const sizeClass = size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : ''
  const variantClass = styles[variant]

  const btnContent = (
    <>
      {children}
      {icon && <span className={styles.icon}>{icon}</span>}
    </>
  )

  const classes = [styles.btn, variantClass, sizeClass, className].filter(Boolean).join(' ')

  let btn = null
  if (Tag === 'a') {
    // cast to avoid attribute mismatch
    const { type, disabled, ...anchorRest } = rest as any
    btn = (
      <a
        href={href}
        className={classes}
        {...anchorRest}
      >
        {btnContent}
      </a>
    )
  } else {
    btn = (
      <button
        className={classes}
        {...rest}
      >
        {btnContent}
      </button>
    )
  }

  if (withBorder) {
    return <div className={styles.btnBorderWrap}>{btn}</div>
  }

  return btn
}
