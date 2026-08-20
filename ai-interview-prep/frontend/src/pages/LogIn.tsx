import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'
import NavHeader from '../components/NavHeader'
import Footer from '../components/Footer'
import Button from '../components/Button'
import OrbitVisual from '../components/OrbitVisual'
import styles from './AuthPage.module.css'

export default function LogIn() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextPath = searchParams.get('next') ?? '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token, data.user)
      
      const onboardingDone = localStorage.getItem('pp_onboarding_complete') === 'true'
      if (!onboardingDone) {
        navigate('/onboarding')
      } else {
        navigate(nextPath)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <NavHeader />
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to continue your preparation.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="login-email" className={styles.label}>Email</label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="login-password" className={styles.label}>Password</label>
              <input
                id="login-password"
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
              id="login-submit"
              type="submit"
              variant="primary"
              disabled={loading}
              className={styles.submitBtn}
              withBorder
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className={styles.toggle}>
            Don't have an account?{' '}
            <Link to="/signup" className={styles.toggleLink}>
              Sign up
            </Link>
          </p>
        </div>

        <div className={styles.deco} aria-hidden="true">
          <OrbitVisual mode="ring" size={280} fillPct={75} ringLabel="Mock Score" />
        </div>
      </main>
      <Footer />
    </div>
  )
}
