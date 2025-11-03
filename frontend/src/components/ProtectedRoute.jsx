import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getToken } from '../lib/auth.js'

export default function ProtectedRoute({ children }) {
  const [ready, setReady] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    setHasToken(!!getToken())
    setReady(true)
  }, [])

  if (!ready) return null
  if (!hasToken) return <Navigate to="/login" replace />
  return children
}

