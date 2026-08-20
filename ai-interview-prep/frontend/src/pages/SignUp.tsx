import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import NavHeader from '../components/NavHeader'
import Footer from '../components/Footer'
import Button from '../components/Button'
import OrbitVisual from '../components/OrbitVisual'
import styles from './AuthPage.module.css'

export default function SignUp() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/signup', {
        name,
        email,
        password,
        role: 'candidate'
      })
      login(data.access_token, data.user)
      navigate('/onboarding')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <NavHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Get started on PrepPilot today.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="signup-name" className={styles.label}>Full Name</label>
              <input
                id="signup-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.input}
                placeholder="John Doe"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="signup-email" className={styles.label}>Email</label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="signup-password" className={styles.label}>Password</label>
              <input
                id="signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="••••••••"
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <Button
              id="signup-submit"
              type="submit"
              variant="primary"
              disabled={loading}
              className={styles.submitBtn}
              withBorder
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <p className={styles.toggle}>
            Already have an account?{' '}
            <Link to="/login" className={styles.toggleLink}>
              Sign in
            </Link>
          </p>
        </div>

        {/* Decorative elements */}
        <div className={styles.deco} aria-hidden="true">
          <OrbitVisual mode="ring" size={280} fillPct={45} ringLabel="Focus Rate" />
        </div>
      </main>
      <Footer />
    </div>
  )
}
