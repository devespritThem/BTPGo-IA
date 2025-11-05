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

  // Écoute les changements de stockage (autres onglets) et réévalue le token
  useEffect(() => {
    const onStorage = (e) => {
      if (!e || !e.key || e.key !== 'btpgo_token') return
      setHasToken(!!getToken())
    }
    try { window.addEventListener('storage', onStorage) } catch {}
    return () => { try { window.removeEventListener('storage', onStorage) } catch {} }
  }, [])

  if (!ready) return null
  if (!hasToken) return <Navigate to="/login" replace />
  return children
}

