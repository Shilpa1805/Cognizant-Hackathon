import { useState, useEffect, useRef } from 'react'

interface UseCountUpOptions {
  target: number
  duration?: number  // ms, default 2000
  delay?: number     // ms start delay, default 0
}

/**
 * useCountUp — animates a number from 0 to target over `duration` ms.
 * Uses easeOutCubic for natural deceleration.
 * Starts after `delay` ms.
 */
export function useCountUp({ target, duration = 2000, delay = 0 }: UseCountUpOptions) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    const startAnimation = () => {
      startRef.current = performance.now()

      const tick = (now: number) => {
        const elapsed = now - startRef.current
        const progress = Math.min(elapsed / duration, 1)
        // easeOutCubic: 1 - (1 - t)^3
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    const timer = setTimeout(startAnimation, delay)
    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, delay])

  return value
}
