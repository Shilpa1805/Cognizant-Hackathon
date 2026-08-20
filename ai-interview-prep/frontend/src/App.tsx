import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'

// Layout shell (provides NavHeader, main container, and Footer)
import Layout from './components/Layout'

// Pages
import Landing       from './pages/Landing'
import LogIn         from './pages/LogIn'
import SignUp        from './pages/SignUp'
import Onboarding    from './pages/Onboarding'
import Dashboard     from './pages/Dashboard'
import Practice      from './pages/Practice'
import MockInterview from './pages/MockInterview'
import Feedback      from './pages/Feedback'
import Analytics     from './pages/Analytics'
import Profile       from './pages/Profile'
import History       from './pages/History'
import PriorityPlan  from './pages/PriorityPlan'
import SessionAnalysis from './pages/SessionAnalysis'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* ── Standalone Landing Page ────────────────── */}
      <Route path="/" element={<Landing />} />

      {/* ── Auth pages ─────────────────────────────── */}
      <Route path="/login" element={<LogIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* ── All Main App Pages (Protected & Wrapped) ── */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard"           element={<Dashboard />} />
        <Route path="/practice"            element={<Practice />} />
        <Route path="/practice/analysis"   element={<SessionAnalysis />} />
        <Route path="/mock-interview/:id"  element={<MockInterview />} />
        <Route path="/mock/analysis"       element={<SessionAnalysis />} />
        <Route path="/feedback/:sessionId" element={<Feedback />} />
        <Route path="/analytics"           element={<Analytics />} />
        <Route path="/profile"             element={<Profile />} />
        <Route path="/history"             element={<History />} />
        <Route path="/priority-plan"       element={<PriorityPlan />} />
        <Route path="/onboarding"          element={<Onboarding />} />
      </Route>

      {/* ── Fallback ─────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

/**
 * App — top-level shell with AuthProvider.
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
