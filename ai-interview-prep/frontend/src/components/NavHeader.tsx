import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from './Button'
import styles from './NavHeader.module.css'

interface NavLink_ {
  to: string
  label: string
}

interface NavHeaderProps {
  links?: NavLink_[]
}

const DEFAULT_LOGGED_OUT_LINKS: NavLink_[] = [
  { to: '/practice',      label: 'Practice' },
  { to: '/mock-interview/new', label: 'Mock Interviews' },
  { to: '/resources',    label: 'Resources' },
  { to: '/pricing',      label: 'Pricing' },
]

const DEFAULT_LOGGED_IN_LINKS: NavLink_[] = [
  { to: '/dashboard',          label: 'Dashboard' },
  { to: '/practice',           label: 'Practice' },
  { to: '/mock-interview/new', label: 'Mock Interview' },
  { to: '/analytics',          label: 'Analytics' },
  { to: '/resources',          label: 'Resources' },
  { to: '/pricing',            label: 'Pricing' },
]

/**
 * NavHeader — shared across every page.
 * Identical structure/position/spacing everywhere.
 * Only nav-link list and auth-state right side changes.
 */
export default function NavHeader({ links }: NavHeaderProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const navLinks = links ?? (isAuthenticated ? DEFAULT_LOGGED_IN_LINKS : DEFAULT_LOGGED_OUT_LINKS)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
    setDropdownOpen(false)
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <nav className={styles.nav} role="navigation" aria-label="Main navigation">
      <div className={styles.inner}>
        {/* Logo */}
        <Link to={isAuthenticated ? '/dashboard' : '/'} className={styles.logo} aria-label="PrepPilot home">
          <div className={styles.logoMark}>🎯</div>
          <span className={styles.logoText}>
            Prep<span className={styles.logoAccent}>Pilot</span>
          </span>
        </Link>

        {/* Nav links */}
        <ul className={styles.links} role="list">
          {navLinks.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  [styles.link, isActive ? styles.linkActive : ''].join(' ')
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right: auth controls */}
        <div className={styles.actions}>
          {isAuthenticated ? (
            <div className={styles.avatarWrap} ref={dropdownRef}>
              <button
                id="nav-avatar-btn"
                className={styles.avatar}
                onClick={() => setDropdownOpen((v) => !v)}
                aria-label="Open user menu"
                aria-expanded={dropdownOpen}
              >
                {initials}
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown} role="menu">
                  <Link
                    to="/profile"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    👤 Profile & Settings
                  </Link>
                  <Link
                    to="/analytics"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setDropdownOpen(false)}
                  >
                    📊 Analytics
                  </Link>
                  <div className={styles.dropdownDivider} />
                  <button
                    id="nav-logout-btn"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    🚪 Log Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Button
                as="a"
                href="/login"
                variant="secondary"
                size="sm"
                id="nav-login-btn"
              >
                Log In
              </Button>
              <Button
                as="a"
                href="/signup"
                variant="primary"
                size="sm"
                id="nav-get-started-btn"
                withBorder
              >
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
