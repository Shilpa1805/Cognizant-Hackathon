import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

/**
 * Footer — rendered identically on every page.
 * Structure never changes; only the year updates dynamically.
 */
export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          {/* Brand */}
          <div className={styles.brand}>
            <Link to="/" className={styles.logo}>
              <span className={styles.logoMark}>🎯</span>
              <span className={styles.logoText}>
                Prep<span className={styles.logoAccent}>Pilot</span>
              </span>
            </Link>
            <p className={styles.tagline}>
              AI-powered mock interviews and smart feedback to help you land your dream role.
            </p>
          </div>

          {/* Product links */}
          <div className={styles.col}>
            <h4>Product</h4>
            <ul>
              <li><Link to="/practice">Practice</Link></li>
              <li><Link to="/mock-interview/new">Mock Interview</Link></li>
              <li><Link to="/analytics">Analytics</Link></li>
              <li><Link to="/resources">Resources</Link></li>
            </ul>
          </div>

          {/* Company links */}
          <div className={styles.col}>
            <h4>Company</h4>
            <ul>
              <li><Link to="/pricing">Pricing</Link></li>
              <li><a href="#" onClick={e => e.preventDefault()}>Blog</a></li>
              <li><a href="#" onClick={e => e.preventDefault()}>About</a></li>
            </ul>
          </div>

          {/* Support links */}
          <div className={styles.col}>
            <h4>Support</h4>
            <ul>
              <li><a href="#" onClick={e => e.preventDefault()}>Documentation</a></li>
              <li><a href="#" onClick={e => e.preventDefault()}>Community</a></li>
              <li><a href="#" onClick={e => e.preventDefault()}>Contact</a></li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {year} <span>PrepPilot</span>. All rights reserved.
          </p>
          <nav className={styles.legal} aria-label="Legal links">
            <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>
            <a href="#" onClick={e => e.preventDefault()}>Terms of Service</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
