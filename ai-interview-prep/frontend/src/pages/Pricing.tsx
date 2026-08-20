import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Badge from '../components/Badge'
import styles from './Pricing.module.css'

interface Plan {
  id: string
  name: string
  price: string
  period: string
  desc: string
  features: string[]
  isFeatured?: boolean
  cta: string
}

const PLANS: Plan[] = [
  {
    id: 'plan-free',
    name: 'Starter',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for quick practice sessions.',
    features: [
      '5 practice questions per day',
      'Instant fused scoring metrics',
      'Basic topic analytics history',
      'Access to core resources/guides',
    ],
    cta: 'Use Starter Free',
  },
  {
    id: 'plan-pro',
    name: 'Prep Pro',
    price: '$19',
    period: '/ month',
    desc: 'Everything you need to land the offer.',
    features: [
      'Unlimited practice questions',
      'AI mock interview rooms',
      'Adaptive followup questions',
      'Full skill-radar profile',
      'Custom prioritization plans',
    ],
    isFeatured: true,
    cta: 'Upgrade to Pro',
  },
  {
    id: 'plan-teams',
    name: 'Scale Team',
    price: '$49',
    period: '/ month',
    desc: 'For bootcamp classes and mock pods.',
    features: [
      'Everything in Pro tier',
      'Team collaborative mock rooms',
      'Scoring calibrator suite',
      'Dedicated support channels',
    ],
    cta: 'Contact Sales',
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSubscribe = (plan: Plan) => {
    if (plan.id === 'plan-free') {
      navigate('/dashboard')
      return
    }
    setSelectedPlan(plan)
  }

  const handleCheckout = () => {
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setSelectedPlan(null)
      navigate('/dashboard')
    }, 1500)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Simple, Transparent Plans</h1>
        <p className={styles.subtitle}>Unlock detailed AI reports, custom study plans, and live mock rooms.</p>
      </div>

      <div className={styles.grid}>
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={[
              styles.planCard,
              plan.isFeatured ? styles.featuredCard : '',
            ].join(' ')}
            variant={plan.isFeatured ? 'accent' : 'default'}
          >
            {plan.isFeatured && (
              <Badge variant="accent" className={styles.badge}>
                Popular
              </Badge>
            )}

            <div className={styles.planHeader}>
              <span className={styles.planName}>{plan.name}</span>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {plan.desc}
              </p>
              <div className={styles.priceRow}>
                <span className={styles.price}>{plan.price}</span>
                <span className={styles.period}>{plan.period}</span>
              </div>

              <div className={styles.featuresList}>
                {plan.features.map((f, idx) => (
                  <div key={idx} className={styles.featureItem}>
                    <span className={styles.featureIcon}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant={plan.isFeatured ? 'primary' : 'secondary'}
              withBorder={plan.isFeatured}
              onClick={() => handleSubscribe(plan)}
              className={styles.ctaBtn}
            >
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>

      {/* Checkout Stub Modal Overlay */}
      {selectedPlan && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <span className={styles.modalTitle}>Mock Checkout</span>
            <p className={styles.modalDesc}>
              You are subscribing to the <strong>{selectedPlan.name}</strong> tier at{' '}
              <strong>{selectedPlan.price} {selectedPlan.period}</strong>.
            </p>
            <p className={styles.modalDesc} style={{ fontSize: 'var(--text-xs)', opacity: 0.6 }}>
              (This is a demo checkout portal sandbox.)
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
              <Button variant="secondary" onClick={() => setSelectedPlan(null)} disabled={processing}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCheckout} disabled={processing} withBorder>
                {processing ? 'Processing...' : 'Complete Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
