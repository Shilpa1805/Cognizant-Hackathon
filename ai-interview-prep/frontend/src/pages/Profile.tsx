import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Card from '../components/Card'
import Button from '../components/Button'
import styles from './Profile.module.css'

export default function Profile() {
  const navigate = useNavigate()
  const { user, onboardingData, completeOnboarding, logout } = useAuth()

  // Edit states for target settings
  const [role, setRole] = useState(onboardingData?.targetRole ?? 'software-engineer')
  const [companies, setCompanies] = useState((onboardingData?.targetCompanies ?? []).join(', '))
  const [experience, setExperience] = useState(onboardingData?.experienceLevel ?? 'entry')
  const [success, setSuccess] = useState(false)

  const handleSave = () => {
    const list = companies.split(',').map((c) => c.trim()).filter(Boolean)
    completeOnboarding({
      targetRole: role,
      targetCompanies: list,
      experienceLevel: experience,
      focusTopics: onboardingData?.focusTopics ?? [],
    })
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Profile & Settings</h1>

      <div className={styles.grid}>
        {/* Left Side: Account Info summary */}
        <div>
          <h2 className={styles.sectionTitle}>Account Information</h2>
          <Card variant="nohover" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Name</span>
              <span className={styles.infoValue}>{user?.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user?.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Account Role</span>
              <span className={styles.infoValue} style={{ textTransform: 'capitalize' }}>
                {user?.role}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Member Since</span>
              <span className={styles.infoValue}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'August 2026'}
              </span>
            </div>

            <Button
              id="profile-logout-btn"
              variant="secondary"
              onClick={handleLogout}
              style={{ marginTop: 'var(--space-6)', width: '100%', justifyContent: 'center' }}
            >
              Sign Out
            </Button>
          </Card>
        </div>

        {/* Right Side: target role settings */}
        <div>
          <h2 className={styles.sectionTitle}>Target Goals</h2>
          <Card variant="nohover" className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Target Job Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={styles.select}>
                <option value="software-engineer">Software Engineer</option>
                <option value="backend-engineer">Backend Engineer</option>
                <option value="frontend-engineer">Frontend Engineer</option>
                <option value="ml-engineer">ML Engineer</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Target Companies (comma separated)</label>
              <input
                type="text"
                value={companies}
                onChange={(e) => setCompanies(e.target.value)}
                className={styles.input}
                placeholder="Google, Stripe, Microsoft"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Experience Level</label>
              <select value={experience} onChange={(e) => setExperience(e.target.value)} className={styles.select}>
                <option value="entry">Entry Level (0 - 2 years)</option>
                <option value="mid">Mid Level (2 - 5 years)</option>
                <option value="senior">Senior Level (5+ years)</option>
                <option value="lead">Lead / Principal Architecture</option>
              </select>
            </div>

            <div className={styles.actionRow}>
              {success && (
                <span style={{ color: 'var(--color-success)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                  ✓ Settings saved successfully
                </span>
              )}
              <Button
                variant="primary"
                onClick={handleSave}
                withBorder
                style={{ marginLeft: 'auto' }}
              >
                Save Settings
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
