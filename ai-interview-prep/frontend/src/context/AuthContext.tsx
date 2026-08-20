import { createContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'

// ------------------------------------------------------------------
// Types — match backend AuthResponse exactly
// ------------------------------------------------------------------
export interface AuthUser {
  user_id: string
  name: string
  email: string
  role: string
  created_at: string
}

export interface OnboardingData {
  targetRole: string
  targetCompanies: string[]
  experienceLevel: string
  focusTopics: string[]
}

interface AuthContextValue {
  user: AuthUser
  token: string
  isAuthenticated: boolean
  onboardingComplete: boolean
  onboardingData: OnboardingData
  login: (token: string, user: AuthUser) => void
  logout: () => void
  completeOnboarding: (data: OnboardingData) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'pp_access_token'
const USER_KEY  = 'pp_user'
const ONBOARDING_KEY = 'pp_onboarding_complete'
const ONBOARDING_DATA_KEY = 'pp_onboarding_data'

// Default Demo User for instant demo access without auth barriers
export const DEFAULT_DEMO_USER: AuthUser = {
  user_id: '00000000-0000-0000-0000-000000000002',
  name: 'Demo Pilot',
  email: 'demo@preppilot.ai',
  role: 'candidate',
  created_at: new Date().toISOString(),
}

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  targetRole: 'software-engineer',
  targetCompanies: ['Google', 'Amazon', 'Stripe'],
  experienceLevel: 'mid',
  focusTopics: ['dsa', 'system-design', 'behavioral'],
}


/**
 * AuthProvider — provides default demo user so all features can be demonstrated smoothly.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY)
    return stored === 'true'
  })
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(() => {
    try {
      const stored = localStorage.getItem(ONBOARDING_DATA_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  // Set default auth interceptor token
  useEffect(() => {
    if (token) {
      localStorage.setItem('access_token', token)
    } else {
      localStorage.removeItem('access_token')
    }
  }, [token])

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    localStorage.setItem('access_token', newToken)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    setOnboardingComplete(false)
    setOnboardingData(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem(ONBOARDING_KEY)
    localStorage.removeItem(ONBOARDING_DATA_KEY)
    localStorage.removeItem('access_token')
  }, [])

  const completeOnboarding = useCallback((data: OnboardingData) => {
    setOnboardingComplete(true)
    setOnboardingData(data)
    localStorage.setItem(ONBOARDING_KEY, 'true')
    localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(data))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user: user as AuthUser, // Only used when authenticated
        token: token as string,
        isAuthenticated: !!token && !!user,
        onboardingComplete,
        onboardingData: onboardingData as OnboardingData, // Only used when onboarded
        login,
        logout,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
