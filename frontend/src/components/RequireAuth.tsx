import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

export default function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        Chargement…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
