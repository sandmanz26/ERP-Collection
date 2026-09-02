import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/useAuth'

/** Everything behind the shell needs a signed-in user; the attempted path is remembered. */
export function RequireAuth() {
  const signedIn = useAuth((s) => s.currentUserId !== null)
  const location = useLocation()
  if (!signedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** A signed-in user landing on /login goes straight to the dashboard. */
export function RedirectIfSignedIn() {
  const signedIn = useAuth((s) => s.currentUserId !== null)
  if (signedIn) return <Navigate to="/" replace />
  return <Outlet />
}
