import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useFormContext } from "../context/useFormContext"
import { useAuth } from "../context/useAuth"

const ROUTES = {
  farmer: "/farmer",
  farm: "/farm",
  verification: "/verification",
  complete: "/dashboard",
}

function nextRoute(status) {
  if (!status.farmer) return ROUTES.farmer
  if (!status.farm) return ROUTES.farm
  if (!status.verificationSubmitted) return ROUTES.verification
  return ROUTES.complete
}

export default function OnboardingRoute({ step }) {
  const location = useLocation()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { status, loading, error, refreshStatus } = useFormContext()

  if (authLoading) {
    return <main className="ff-page" role="status">Restoring your session...</main>
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (error) {
    return (
      <main className="ff-page">
        <div className="ff-shell">
          <section className="ff-card" role="alert">
            <p>{error}</p>
            <button type="button" className="ff-btn ff-btn-primary" onClick={refreshStatus}>
              Try again
            </button>
          </section>
        </div>
      </main>
    )
  }

  if (loading || !status) {
    return <main className="ff-page" role="status">Checking your onboarding progress...</main>
  }

  const target = nextRoute(status)
  if (target !== ROUTES[step]) return <Navigate to={target} replace />
  return <Outlet />
}
