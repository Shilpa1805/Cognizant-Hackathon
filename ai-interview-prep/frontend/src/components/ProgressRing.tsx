import OrbitVisual from './OrbitVisual'

interface ProgressRingProps {
  /** 0–100 */
  value: number
  size?: number
  label?: string
}

/**
 * ProgressRing — thin wrapper around OrbitVisual ring mode.
 * Use for per-topic score rings in Dashboard and Analytics.
 */
export default function ProgressRing({ value, size = 120, label }: ProgressRingProps) {
  return <OrbitVisual mode="ring" size={size} fillPct={value} ringLabel={label} />
}
