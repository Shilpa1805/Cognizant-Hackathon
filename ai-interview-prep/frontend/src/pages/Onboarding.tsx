import { useState, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NavHeader from '../components/NavHeader'
import Footer from '../components/Footer'
import Button from '../components/Button'
import ProgressRing from '../components/ProgressRing'
import styles from './Onboarding.module.css'

const ROLES = [
  { id: 'software-engineer', label: 'Software Engineer', icon: '💻', desc: 'Full Stack, Generalist' },
  { id: 'backend-engineer', label: 'Backend Engineer', icon: '⚙️', desc: 'APIs, DBs, System Design' },
  { id: 'frontend-engineer', label: 'Frontend Engineer', icon: '🎨', desc: 'React, UI, UX, Styling' },
  { id: 'ml-engineer', label: 'ML Engineer', icon: '🤖', desc: 'AI, Models, Pipelines' },
]

const EXPERIENCE_LEVELS = [
  { id: 'entry', label: 'Entry Level', icon: '🌱', desc: '0 - 2 years' },
  { id: 'mid', label: 'Mid Level', icon: '🌿', desc: '2 - 5 years' },
  { id: 'senior', label: 'Senior Level', icon: '🌳', desc: '5+ years' },
  { id: 'lead', label: 'Lead / Principal', icon: '👑', desc: 'Architecture & Leadership' },
]

const TOPICS = [
  { id: 'dsa', label: 'Data Structures & Algorithms', emoji: '🧮' },
  { id: 'system-design', label: 'System Design', emoji: '🏗️' },
  { id: 'behavioral', label: 'Behavioral & Leadership', emoji: '💬' },
  { id: 'databases', label: 'Databases & SQL', emoji: '🗄️' },
  { id: 'frontend', label: 'Frontend & Javascript', emoji: '🖥️' },
  { id: 'ml', label: 'Machine Learning', emoji: '🤖' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { completeOnboarding } = useAuth()
  const [step, setStep] = useState(1)

  // Onboarding Form State
  const [targetRole, setTargetRole] = useState('')
  const [companiesInput, setCompaniesInput] = useState('')
  const [targetCompanies, setTargetCompanies] = useState<string[]>([])
  const [experienceLevel, setExperienceLevel] = useState('')
  const [focusTopics, setFocusTopics] = useState<string[]>([])

  const totalSteps = 4
  const fillPct = (step / totalSteps) * 100

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(s => s + 1)
    } else {
      // Save onboarding info
      completeOnboarding({
        targetRole,
        targetCompanies,
        experienceLevel,
        focusTopics,
      })
      navigate('/dashboard')
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(s => s - 1)
    }
  }

  const handleAddCompany = () => {
    const trimmed = companiesInput.trim()
    if (trimmed && !targetCompanies.includes(trimmed)) {
      setTargetCompanies([...targetCompanies, trimmed])
      setCompaniesInput('')
    }
  }

  const handleCompanyKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddCompany()
    }
  }

  const handleRemoveCompany = (c: string) => {
    setTargetCompanies(targetCompanies.filter(comp => comp !== c))
  }

  const handleToggleTopic = (id: string) => {
    if (focusTopics.includes(id)) {
      setFocusTopics(focusTopics.filter(t => t !== id))
    } else {
      setFocusTopics([...focusTopics, id])
    }
  }

  const isStepValid = () => {
    if (step === 1) return targetRole !== ''
    if (step === 2) return targetCompanies.length > 0
    if (step === 3) return experienceLevel !== ''
    if (step === 4) return focusTopics.length > 0
    return false
  }

  return (
    <div className={styles.page}>
      <NavHeader />
      <main className={styles.main}>
        <div className={styles.container}>
          
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Tailor Your Path</h1>
              <p className={styles.stepInfo}>Step {step} of {totalSteps}</p>
            </div>
            <div className={styles.progressRingWrap}>
              <ProgressRing value={fillPct} size={64} label="" />
            </div>
          </div>

          <div className={styles.content}>
            {step === 1 && (
              <div>
                <h2 className={styles.questionText}>What is your target role?</h2>
                <div className={styles.optionsGrid}>
                  {ROLES.map(r => (
                    <div
                      key={r.id}
                      className={[
                        styles.optionCard,
                        targetRole === r.id ? styles.optionCardActive : ''
                      ].join(' ')}
                      onClick={() => setTargetRole(r.id)}
                    >
                      <span className={styles.optionIcon}>{r.icon}</span>
                      <div>
                        <span className={styles.optionLabel}>{r.label}</span>
                        <p className={styles.optionSub}>{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className={styles.questionText}>Which companies are you targeting?</h2>
                <input
                  type="text"
                  placeholder="e.g. Google, Stripe, Canva (press Enter)"
                  value={companiesInput}
                  onChange={e => setCompaniesInput(e.target.value)}
                  onKeyDown={handleCompanyKeyDown}
                  className={styles.inputField}
                />
                <div className={styles.tagContainer}>
                  {targetCompanies.map(c => (
                    <span key={c} className={styles.tag}>
                      {c}
                      <span
                        className={styles.tagRemove}
                        onClick={() => handleRemoveCompany(c)}
                      >
                        ×
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className={styles.questionText}>What is your experience level?</h2>
                <div className={styles.optionsGrid}>
                  {EXPERIENCE_LEVELS.map(level => (
                    <div
                      key={level.id}
                      className={[
                        styles.optionCard,
                        experienceLevel === level.id ? styles.optionCardActive : ''
                      ].join(' ')}
                      onClick={() => setExperienceLevel(level.id)}
                    >
                      <span className={styles.optionIcon}>{level.icon}</span>
                      <div>
                        <span className={styles.optionLabel}>{level.label}</span>
                        <p className={styles.optionSub}>{level.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className={styles.questionText}>Select your key focus areas</h2>
                <div className={styles.optionsGrid}>
                  {TOPICS.map(topic => {
                    const isActive = focusTopics.includes(topic.id)
                    return (
                      <div
                        key={topic.id}
                        className={[
                          styles.optionCard,
                          isActive ? styles.optionCardActive : ''
                        ].join(' ')}
                        onClick={() => handleToggleTopic(topic.id)}
                      >
                        <span className={styles.optionIcon}>{topic.emoji}</span>
                        <span className={styles.optionLabel}>{topic.label}</span>
                        <div
                          className={[
                            styles.checkbox,
                            isActive ? styles.checkboxActive : ''
                          ].join(' ')}
                        >
                          {isActive && '✓'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={styles.footer}>
            <Button
              variant="secondary"
              onClick={handleBack}
              disabled={step === 1}
              size="sm"
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!isStepValid()}
              size="sm"
              withBorder
            >
              {step === totalSteps ? 'Finish Setup' : 'Continue'}
            </Button>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  )
}
