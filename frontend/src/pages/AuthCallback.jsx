import { useEffect } from 'react'
import { setToken, setOrgId } from '../lib/auth.js'

export default function AuthCallback() {
  useEffect(() => {
    try {
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
      const p = new URLSearchParams(hash)
      const token = p.get('token')
      const orgId = p.get('orgId')
      if (token) setToken(token)
      if (orgId) setOrgId(orgId)
    } catch {}
    // Redirect to dashboard
    window.location.replace('/')
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-600">Connexion en cours…</div>
  )
}

