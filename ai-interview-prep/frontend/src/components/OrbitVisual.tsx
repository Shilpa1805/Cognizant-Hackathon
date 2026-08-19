import { useEffect, useState } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import styles from './OrbitVisual.module.css'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export type OrbitMode = 'hero' | 'ring'

interface OrbitVisualProps {
  mode: OrbitMode
  /** Size of the full visual container in pixels */
  size?: number
  /** ring mode: 0–100 fill percentage */
  fillPct?: number
  /** ring mode: label below the percentage */
  ringLabel?: string
}

// ------------------------------------------------------------------
// Hero mode constants
// ------------------------------------------------------------------
const ORBIT_DIAMETERS = [353, 501, 649, 797]  // px at full 720px size
const ORBIT_DURATIONS = [30, 40, 50, 60]       // seconds

// 8 topic tiles distributed across 4 orbits (2 per orbit)
const TILES = [
  { emoji: '🧮', label: 'DSA',     orbit: 0, angleDeg: 45  },
  { emoji: '🏗️', label: 'System',  orbit: 0, angleDeg: 225 },
  { emoji: '💬', label: 'Behav.',  orbit: 1, angleDeg: 90  },
  { emoji: '🗄️', label: 'SQL',     orbit: 1, angleDeg: 270 },
  { emoji: '🖥️', label: 'Front.',  orbit: 2, angleDeg: 30  },
  { emoji: '🤖', label: 'ML',      orbit: 2, angleDeg: 210 },
  { emoji: '📦', label: 'Product', orbit: 3, angleDeg: 135 },
  { emoji: '🎯', label: 'Lead.',   orbit: 3, angleDeg: 315 },
]

const ANIMATION_DELAYS = [0.6, 0.9, 1.2, 1.5, 1.8, 2.0, 2.2, 2.3]

// ------------------------------------------------------------------
// Helper: convert polar to cartesian offset from center
// angleDeg is the initial orbit placement angle
// ------------------------------------------------------------------
function polarToXY(orbitR: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: orbitR * Math.cos(rad),
    y: orbitR * Math.sin(rad),
  }
}

// ------------------------------------------------------------------
// Ring mode component (SVG circular progress ring)
// ------------------------------------------------------------------
interface RingModeProps {
  size: number
  fillPct: number
  ringLabel?: string
}

function RingMode({ size, fillPct, ringLabel }: RingModeProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t) }, [])

  const strokeW = Math.max(3, size * 0.04)
  const radius = (size - strokeW * 2) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - (mounted ? fillPct / 100 : 0))

  const pctFontSize = Math.round(size * 0.22)
  const labelFontSize = Math.round(size * 0.1)

  return (
    <div className={styles.ringRoot} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className={styles.ringBg}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeW}
        />
        <circle
          className={styles.ringFill}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeW}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringPct} style={{ fontSize: pctFontSize }}>
          {Math.round(fillPct)}%
        </span>
        {ringLabel && (
          <span className={styles.ringSubLabel} style={{ fontSize: labelFontSize }}>
            {ringLabel}
          </span>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Hero mode component
// ------------------------------------------------------------------
interface HeroModeProps {
  size: number
}

function HeroMode({ size }: HeroModeProps) {
  const scale = size / 720
  const count = useCountUp({ target: 50000, duration: 2000, delay: 800 })

  const centerSize = Math.round(120 * scale)
  const tileSizeBase = Math.round(52 * scale)

  return (
    <div className={styles.root} style={{ width: size, height: size }}>
      {/* Orbit rings */}
      <div className={styles.orbitsContainer}>
        {ORBIT_DIAMETERS.map((d, i) => {
          const scaledD = Math.round(d * scale)
          const isEven = i % 2 === 0
          return (
            <div
              key={i}
              className={[styles.orbit, isEven ? styles.orbitCW : styles.orbitCCW].join(' ')}
              style={{
                width: scaledD,
                height: scaledD,
                animationDuration: `${ORBIT_DURATIONS[i]}s`,
              }}
            >
              {/* Tiles on this orbit */}
              {TILES.filter((t) => t.orbit === i).map((tile, ti) => {
                const orbitR = scaledD / 2
                const { x, y } = polarToXY(orbitR, tile.angleDeg)
                const delay = ANIMATION_DELAYS[TILES.indexOf(tile)]
                const tileSize = tileSizeBase + (i === 2 || i === 3 ? 6 : 0)

                return (
                  <div
                    key={ti}
                    className={styles.tile}
                    style={{
                      width: tileSize,
                      height: tileSize,
                      fontSize: Math.round(tileSize * 0.45),
                      /* Position at center + offset, then counter-rotate so tile stays upright */
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                      animationDelay: `${delay}s`,
                      /* Counter-rotate: opposite of parent orbit so label stays readable */
                      animation: `flyIn 0.6s var(--ease-out-expo) ${delay}s both`,
                    }}
                  >
                    <div
                      className={styles.tileInner}
                      style={{
                        /* Cancel out the parent's rotation to keep tile upright */
                        animation: isEven
                          ? `spinCCW ${ORBIT_DURATIONS[i]}s linear infinite`
                          : `spinCW ${ORBIT_DURATIONS[i]}s linear infinite`,
                      }}
                    >
                      <span className={styles.tileEmoji}>{tile.emoji}</span>
                      <span className={styles.tileLabel}>{tile.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Center stat */}
      <div
        className={styles.center}
        style={{ width: centerSize, height: centerSize }}
      >
        <span className={styles.centerStat} style={{ fontSize: Math.round(22 * scale) }}>
          {count >= 1000 ? `${Math.floor(count / 1000)}K+` : count}
        </span>
        <span className={styles.centerLabel} style={{ fontSize: Math.round(9 * scale) }}>
          Sessions Completed
        </span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Public export
// ------------------------------------------------------------------

/**
 * OrbitVisual — parameterized orbit animation.
 *
 * mode="hero"  → full 720px animated orbits with topic tiles (landing page ONLY)
 * mode="ring"  → compact SVG progress ring (dashboard, analytics, etc.)
 */
export default function OrbitVisual({
  mode,
  size,
  fillPct = 0,
  ringLabel,
}: OrbitVisualProps) {
  const resolvedSize = size ?? (mode === 'hero' ? 720 : 200)

  if (mode === 'ring') {
    return <RingMode size={resolvedSize} fillPct={fillPct} ringLabel={ringLabel} />
  }

  return <HeroMode size={resolvedSize} />
}
