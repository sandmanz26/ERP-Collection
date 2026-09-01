import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, useCurrentUser } from '@/store/useAuth'

/** Where a role starts its day. An operator works the four-phase view. */
export const homeFor = (role?: string) => (role === 'OPERATOR' ? '/my' : '/')

/** Everything behind the shell needs a signed-in user; the attempted path is remembered. */
export function RequireAuth() {
  const signedIn = useAuth((s) => s.currentUserId !== null)
  const location = useLocation()
  if (!signedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** A signed-in user landing on /login goes straight through to their own home. */
export function RedirectIfSignedIn() {
  const signedIn = useAuth((s) => s.currentUserId !== null)
  const user = useCurrentUser()
  if (signedIn) return <Navigate to={homeFor(user?.role)} replace />
  return <Outlet />
}
