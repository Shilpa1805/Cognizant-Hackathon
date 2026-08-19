import { useState, useEffect, useRef } from 'react'

interface UseTypewriterOptions {
  text: string
  speed?: number  // ms per character, default 35
  delay?: number  // start delay in ms, default 400
}

interface UseTypewriterReturn {
  displayed: string
  done: boolean
}

/**
 * useTypewriter — reveals text character by character.
 * Returns the currently displayed substring and a `done` flag.
 */
export function useTypewriter({ text, speed = 35, delay = 400 }: UseTypewriterOptions): UseTypewriterReturn {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const indexRef = useRef(0)

  useEffect(() => {
    indexRef.current = 0
    setDisplayed('')
    setDone(false)

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        indexRef.current += 1
        setDisplayed(text.slice(0, indexRef.current))

        if (indexRef.current >= text.length) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setDone(true)
        }
      }, speed)
    }, delay)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [text, speed, delay])

  return { displayed, done }
}
