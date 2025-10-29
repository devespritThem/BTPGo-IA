import { Navigate } from 'react-router-dom'
import { getToken } from '../lib/auth.js'

export default function ProtectedRoute({ children }) {
  const token = getToken()
  if (!token) return <Navigate to="/login" replace />
  return children
}

