import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'

// Layout shell
import Layout from './components/Layout'

// Public pages
import Landing    from './pages/Landing'
import LogIn      from './pages/LogIn'
import SignUp     from './pages/SignUp'
import Onboarding from './pages/Onboarding'
import Resources  from './pages/Resources'
import Pricing    from './pages/Pricing'

// Protected pages
import Dashboard     from './pages/Dashboard'
import Practice      from './pages/Practice'
import MockInterview from './pages/MockInterview'
import Feedback      from './pages/Feedback'
import Analytics     from './pages/Analytics'
import Profile       from './pages/Profile'
import History       from './pages/History'
import StudyPlan     from './pages/StudyPlan'

// ------------------------------------------------------------------
// ProtectedRoute — redirects to /login if not authenticated,
// preserving the intended destination via ?next= query param.
// ------------------------------------------------------------------
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }

  return children
}

// ------------------------------------------------------------------
// OnboardingGuard — after login, redirects new users to /onboarding
// before they can access /dashboard or other protected pages.
// Once onboardingComplete flag is set, never shown again.
// ------------------------------------------------------------------
function OnboardingGuard({ children }: { children: JSX.Element }) {
  const { isAuthenticated, onboardingComplete } = useAuth()

  if (isAuthenticated && !onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

// ------------------------------------------------------------------
// App routes
// ------------------------------------------------------------------
function AppRoutes() {
  return (
    <Routes>
      {/* ── Public ─────────────────────────────────── */}
      <Route path="/"         element={<Landing />} />
      <Route path="/login"    element={<LogIn />} />
      <Route path="/signup"   element={<SignUp />} />
      <Route path="/pricing"  element={<Pricing />} />
      <Route path="/resources" element={<Resources />} />

      {/* ── Onboarding (auth-gated but separate from onboarding guard) ── */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />

      {/* ── Protected (authenticated + onboarding complete) ── */}
      <Route
        element={
          <ProtectedRoute>
            <OnboardingGuard>
              <Layout />
            </OnboardingGuard>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard"            element={<Dashboard />} />
        <Route path="/practice"             element={<Practice />} />
        <Route path="/mock-interview/:id"   element={<MockInterview />} />
        <Route path="/feedback/:sessionId"  element={<Feedback />} />
        <Route path="/analytics"            element={<Analytics />} />
        <Route path="/profile"              element={<Profile />} />
        <Route path="/history"              element={<History />} />
        <Route path="/study-plan"           element={<StudyPlan />} />
      </Route>

      {/* ── Fallback ─────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * App — top-level shell.
 * AuthProvider wraps everything so all routes can read auth state.
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
