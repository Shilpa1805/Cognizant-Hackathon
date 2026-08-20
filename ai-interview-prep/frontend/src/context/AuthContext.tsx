import { createContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { mapClerkIdToUUID } from '../lib/clerkMapping'

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

const ONBOARDING_KEY = 'pp_onboarding_complete'
const ONBOARDING_DATA_KEY = 'pp_onboarding_data'

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  targetRole: 'software-engineer',
  targetCompanies: ['Google', 'Amazon', 'Stripe'],
  experienceLevel: 'mid',
  focusTopics: ['dsa', 'system-design', 'behavioral'],
}

/**
 * AuthProvider — wraps Clerk's auth hooks and maps Clerk user to internal AuthUser structure.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser()
  const { getToken, signOut, isLoaded: isAuthLoaded } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    async function fetchToken() {
      if (isAuthLoaded) {
        const t = await getToken()
        setToken(t)
      }
    }
    fetchToken()
  }, [isAuthLoaded, getToken])

  const mappedUserId = useMemo(() => clerkUser?.id ? mapClerkIdToUUID(clerkUser.id) : null, [clerkUser?.id])

  const user = useMemo<AuthUser | null>(() => {
    if (!clerkUser || !mappedUserId) return null
    return {
      user_id: mappedUserId,
      name: clerkUser.fullName || clerkUser.firstName || 'Candidate',
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      role: 'candidate',
      created_at: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
    }
  }, [clerkUser, mappedUserId])

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

  // We don't use these manual login/logout anymore for auth state (Clerk owns it),
  // but they are here to satisfy the interface if components still call them.
  const login = useCallback((_newToken: string, _newUser: AuthUser) => {
    console.warn("Manual login called. Clerk manages auth state now.")
  }, [])

  const logout = useCallback(() => {
    signOut()
  }, [signOut])

  const completeOnboarding = useCallback((data: OnboardingData) => {
    setOnboardingComplete(true)
    setOnboardingData(data)
    localStorage.setItem(ONBOARDING_KEY, 'true')
    localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(data))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!clerkUser,
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
