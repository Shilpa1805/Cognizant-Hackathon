import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

// Layout shell (provides NavHeader, main container, and Footer)
import Layout from './components/Layout'

// Pages
import Landing       from './pages/Landing'
import LogIn         from './pages/LogIn'
import SignUp        from './pages/SignUp'
import Onboarding    from './pages/Onboarding'
import Resources     from './pages/Resources'
import Pricing       from './pages/Pricing'
import Dashboard     from './pages/Dashboard'
import Practice      from './pages/Practice'
import MockInterview from './pages/MockInterview'
import Feedback      from './pages/Feedback'
import Analytics     from './pages/Analytics'
import Profile       from './pages/Profile'
import History       from './pages/History'
import StudyPlan     from './pages/StudyPlan'

function AppRoutes() {
  return (
    <Routes>
      {/* ── Standalone Landing Page ────────────────── */}
      <Route path="/" element={<Landing />} />

      {/* ── Auth pages (optional for testing) ──────── */}
      <Route path="/login" element={<LogIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* ── All Main App Pages (Wrapped with NavHeader + Footer) ── */}
      <Route element={<Layout />}>
        <Route path="/dashboard"           element={<Dashboard />} />
        <Route path="/practice"            element={<Practice />} />
        <Route path="/mock-interview/:id"  element={<MockInterview />} />
        <Route path="/feedback/:sessionId" element={<Feedback />} />
        <Route path="/analytics"           element={<Analytics />} />
        <Route path="/resources"           element={<Resources />} />
        <Route path="/pricing"             element={<Pricing />} />
        <Route path="/profile"             element={<Profile />} />
        <Route path="/history"             element={<History />} />
        <Route path="/study-plan"          element={<StudyPlan />} />
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
