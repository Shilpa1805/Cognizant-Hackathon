import styles from './LogoTicker.module.css'

const COMPANIES = [
  { emoji: '🔍', name: 'Google' },
  { emoji: '📦', name: 'Amazon' },
  { emoji: '🪟', name: 'Microsoft' },
  { emoji: '🍎', name: 'Apple' },
  { emoji: '🎵', name: 'Spotify' },
]

// 5 marks × 4 repeats = 20 items for seamless scroll
const MARKS = [...COMPANIES, ...COMPANIES, ...COMPANIES, ...COMPANIES]

/**
 * LogoTicker — infinite horizontal scroll of company logos.
 * Two copies of the full list ensure seamless looping.
 * Edge fade masks handled via CSS ::before/::after.
 */
export default function LogoTicker() {
  return (
    <section className={styles.section}>
      <p className={styles.caption}>Our candidates landed offers at</p>
      <div className={styles.wrapper} aria-hidden="true">
        {/* Track duplicated for seamless CSS loop */}
        <div className={styles.track}>
          {MARKS.map((c, i) => (
            <div key={i} className={styles.mark}>
              <span className={styles.markEmoji}>{c.emoji}</span>
              <span className={styles.markName}>{c.name}</span>
            </div>
          ))}
          {/* Second copy — CSS animation loops at 50% */}
          {MARKS.map((c, i) => (
            <div key={`dup-${i}`} className={styles.mark}>
              <span className={styles.markEmoji}>{c.emoji}</span>
              <span className={styles.markName}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
