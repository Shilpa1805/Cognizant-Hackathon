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
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  onboardingComplete: boolean
  onboardingData: OnboardingData | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  completeOnboarding: (data: OnboardingData) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'pp_access_token'
const USER_KEY  = 'pp_user'
const ONBOARDING_KEY = 'pp_onboarding_complete'
const ONBOARDING_DATA_KEY = 'pp_onboarding_data'

/**
 * AuthProvider — wraps the entire app.
 * Reads persisted auth state from localStorage on mount.
 * Provides login/logout and onboarding state management.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_KEY)
      const storedOnboarding = localStorage.getItem(ONBOARDING_KEY)
      const storedOnboardingData = localStorage.getItem(ONBOARDING_DATA_KEY)

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      }
      if (storedOnboarding === 'true') {
        setOnboardingComplete(true)
      }
      if (storedOnboardingData) {
        setOnboardingData(JSON.parse(storedOnboardingData))
      }
    } catch {
      // Corrupt localStorage — ignore
    }
    setHydrated(true)
  }, [])

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    // Also keep legacy key for api.ts interceptor
    localStorage.setItem('access_token', newToken)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
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

  // Don't render until hydration is done (prevents flicker)
  if (!hydrated) return null

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        onboardingComplete,
        onboardingData,
        login,
        logout,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
