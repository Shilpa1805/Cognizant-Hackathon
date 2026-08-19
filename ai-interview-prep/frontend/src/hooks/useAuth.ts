import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * useAuth — convenience hook to read AuthContext.
 * Must be used within <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
