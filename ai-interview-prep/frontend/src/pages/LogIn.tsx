import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NavHeader from '../components/NavHeader'
import Footer from '../components/Footer'
import Button from '../components/Button'
import OrbitVisual from '../components/OrbitVisual'
import styles from './AuthPage.module.css'

const ROLES = [
  { id: 'Backend Engineer',   label: 'Backend Engineer',   icon: '⚙️', desc: 'APIs, DBs, System Design' },
  { id: 'Frontend Engineer',  label: 'Frontend Engineer',  icon: '🎨', desc: 'React, UI, UX, Styling' },
  { id: 'Software Engineer',  label: 'Software Engineer',  icon: '💻', desc: 'Full Stack, Generalist' },
  { id: 'ML Engineer',        label: 'ML Engineer',        icon: '🤖', desc: 'AI, Models, Pipelines' },
]

export default function LogIn() {
  const navigate = useNavigate()
  const { login, completeOnboarding } = useAuth()

  // Step 1: enter name | Step 2: pick role
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNameSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email.'); return }
    setError(null)
    setStep(2)
  }

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId)
  }

  const handleFinish = async () => {
    if (!selectedRole) { setError('Please select a role to continue.'); return }
    setLoading(true)

    const dummyPassword = 'demo-clerk-password-123!'
    let userData = null
    let accessToken = 'demo-jwt-token'

    try {
      // Try to register the user so the backend has their user_id
      const { data } = await api.post('/auth/signup', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: dummyPassword,
        role: 'candidate'
      })
      userData = data.user
      accessToken = data.access_token
    } catch (err: any) {
      // If email exists, just log them in
      if (err.response?.status === 400 || err.response?.status === 409) {
        try {
          const { data } = await api.post('/auth/login', {
            email: email.trim().toLowerCase(),
            password: dummyPassword,
          })
          userData = data.user
          accessToken = data.access_token
        } catch (loginErr: any) {
           setError('Failed to setup session. Please try another email.')
           setLoading(false)
           return
        }
      } else {
        setError('Failed to setup session. Please try again.')
        setLoading(false)
        return
      }
    }

    login(accessToken, userData)

    // Save onboarding data with selected role so Practice/Mock can pre-fill it
    completeOnboarding({
      targetRole: selectedRole,
      targetCompanies: [],
      experienceLevel: 'mid',
      focusTopics: [],
    })

    navigate('/dashboard')
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <NavHeader />
      <main className={styles.main}>
        <div className={styles.card}>

          {step === 1 && (
            <>
              <h1 className={styles.title}>Welcome to PrepIQ 👋</h1>
              <p className={styles.subtitle}>Enter your name to get started — no account needed.</p>

              <form onSubmit={handleNameSubmit} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor="login-name" className={styles.label}>Your Name</label>
                  <input
                    id="login-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. Priya Sharma"
                    autoFocus
                  />
                </div>

                <div className={styles.field} style={{ marginTop: '16px' }}>
                  <label htmlFor="login-email" className={styles.label}>Your Email</label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. priya@example.com"
                  />
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <Button
                  id="login-continue"
                  type="submit"
                  variant="primary"
                  className={styles.submitBtn}
                  withBorder
                >
                  Continue →
                </Button>
              </form>

              <p className={styles.toggle}>
                Want the full experience?{' '}
                <Link to="/signup" className={styles.toggleLink}>
                  Sign up
                </Link>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className={styles.title}>Pick your target role</h1>
              <p className={styles.subtitle}>
                Hi {name}! Choose the role you're interviewing for. This pre-fills your practice sessions.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '20px 0' }}>
                {ROLES.map(r => (
                  <div
                    key={r.id}
                    id={`role-${r.id.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleRoleSelect(r.id)}
                    style={{
                      padding: '14px 16px',
                      border: `2px solid ${selectedRole === r.id ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: selectedRole === r.id ? 'rgba(160,104,255,0.1)' : 'var(--surface)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: '22px' }}>{r.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{r.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.desc}</span>
                  </div>
                ))}
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button variant="secondary" onClick={() => setStep(1)} size="sm">
                  ← Back
                </Button>
                <Button
                  id="login-submit"
                  variant="primary"
                  onClick={handleFinish}
                  disabled={loading || !selectedRole}
                  className={styles.submitBtn}
                  withBorder
                >
                  {loading ? 'Setting up...' : 'Start Preparing 🚀'}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className={styles.deco} aria-hidden="true">
          <OrbitVisual mode="ring" size={280} fillPct={75} ringLabel="Mock Score" />
        </div>
      </main>
      <Footer />
    </div>
  )
}
