import { Navigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { Spinner } from '../ui'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-500 text-sm mt-3">Loading ZimCredit...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (requiredRole && !requiredRole.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
