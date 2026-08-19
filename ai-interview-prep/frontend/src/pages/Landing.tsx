import NavHeader from '../components/NavHeader'
import Footer from '../components/Footer'
import Button from '../components/Button'
import OrbitVisual from '../components/OrbitVisual'
import LogoTicker from '../components/LogoTicker'
import TypewriterText from '../components/TypewriterText'
import styles from './Landing.module.css'

const HERO_TEXT = 'Ace Your Next Technical Interview — One Mock Session Away!'

const FEATURES = [
  {
    icon: '🎙️',
    title: 'AI Mock Interviews',
    desc: 'Practice with our AI interviewer that adapts to your level and gives real-time feedback after every answer.',
  },
  {
    icon: '🗂️',
    title: 'Smart Question Bank',
    desc: 'Thousands of curated questions across DSA, System Design, Behavioral, SQL, and more — filtered to your role.',
  },
  {
    icon: '📈',
    title: 'Progress Analytics',
    desc: 'Radar charts, topic scores, and personalized study plans that tell you exactly where to focus next.',
  },
]

/**
 * Landing — public marketing page. Logged-out only.
 * OrbitVisual in hero mode is ONLY used here.
 * TypewriterText is ONLY used here.
 */
export default function Landing() {
  return (
    <div className={styles.page}>
      <NavHeader />

      {/* ── Hero ──────────────────────────────────── */}
      <section className={styles.hero} aria-label="Hero">
        {/* Left: copy + CTAs */}
        <div className={styles.heroLeft}>
          <span className={styles.eyebrow}>🚀 AI-Powered Interview Prep</span>

          <h1 className={styles.heading}>
            <TypewriterText
              text={HERO_TEXT}
              speed={35}
              delay={400}
            />
          </h1>

          <p className={styles.subheading}>
            Sharpen your skills with AI-generated questions tailored to your target role,
            get instant scored feedback, and track your growth over time.
          </p>

          <div className={styles.ctaRow}>
            <Button
              as="a"
              href="/signup"
              variant="primary"
              size="lg"
              withBorder
              icon="›"
              id="hero-get-started-btn"
            >
              Start Practicing
            </Button>
            <Button
              as="a"
              href="/login"
              variant="secondary"
              size="lg"
              id="hero-login-btn"
            >
              Log In
            </Button>
          </div>

          {/* Persona badge — appears at 3.6s */}
          <div className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            <span>Ananya · mock interview live</span>
          </div>
        </div>

        {/* Right: full orbit visual — hero mode only on landing page */}
        <div className={styles.heroRight} aria-hidden="true">
          <OrbitVisual mode="hero" size={720} />
        </div>
      </section>

      {/* ── Logo ticker ───────────────────────────── */}
      <div className={styles.tickerSection}>
        <LogoTicker />
      </div>

      {/* ── Features strip ────────────────────────── */}
      <section className={styles.features} aria-label="Key features">
        {FEATURES.map((f) => (
          <div key={f.title} className={styles.featureCard}>
            <span className={styles.featureIcon} aria-hidden="true">{f.icon}</span>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* ── CTA strip ─────────────────────────────── */}
      <section
        style={{
          textAlign: 'center',
          padding: 'var(--space-16) var(--space-8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-6)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-4xl)',
            fontWeight: 700,
            color: 'var(--text-light)',
            letterSpacing: '-0.04em',
          }}
        >
          Ready to land your dream role?
        </h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 480 }}>
          Join thousands of candidates who used PrepPilot to prep smarter and interview better.
        </p>
        <Button
          as="a"
          href="/signup"
          variant="primary"
          size="lg"
          withBorder
          id="footer-cta-btn"
        >
          Get Started Free
        </Button>
      </section>

      <Footer />
    </div>
  )
}
