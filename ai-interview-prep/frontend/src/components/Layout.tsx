import { Outlet } from 'react-router-dom'
import NavHeader from './NavHeader'
import Footer from './Footer'

/**
 * Layout — thin shell for all protected pages.
 * NavHeader + page content (via <Outlet>) + Footer.
 * Navigation logic and auth state live in NavHeader.
 */
export default function Layout() {
  return (
    <div className="pp-page">
      <NavHeader />
      <main style={{ paddingTop: 'var(--nav-h)', flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
