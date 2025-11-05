import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { API, apiFetch } from '../lib/api.js'
import { getToken, setToken } from '../lib/auth.js'
import { useToast } from '../components/ToastProvider.jsx'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { notify } = useToast()

  // Si un token existe déjà, force la navigation vers la racine
  useEffect(() => {
    try { if (getToken()) window.location.replace('/') } catch {}
  }, [navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!email || !password) { setErr('Email et mot de passe requis'); return }
    setLoading(true)
    try {
      const res = await apiFetch('/auth/login', { method: 'POST', body: { email, password, otp, backupCode } })
      setToken(res.accessToken || res.token)
      notify('Connexion réussie', 'success')
      // Force une navigation pleine page pour éviter tout état résiduel
      window.location.replace('/')
    } catch (e) {
      setErr('Connexion échouée'); notify(e.message || 'Erreur', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded shadow p-6">
        <h1 className="text-xl font-semibold mb-4">Connexion</h1>
        {err && <p className="text-red-600 text-sm mb-2">{String(err)}</p>}
        <form onSubmit={onSubmit} className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" className="w-full border rounded px-3 py-2" />
          <input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="OTP (2FA si actif)" className="w-full border rounded px-3 py-2" />
          <input value={backupCode} onChange={e=>setBackupCode(e.target.value)} placeholder="Code de secours (optionnel)" className="w-full border rounded px-3 py-2" />
          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60">{loading?'Connexion…':'Se connecter'}</button>
        </form>
        <div className="mt-4 text-sm text-gray-600 text-center">
          Pas de compte ? <Link to="/register" className="underline">Créer un compte</Link>
        </div>
        <p className="text-xs text-gray-500 mt-3">Backend: {API}</p>
      </div>
    </div>
  )
}

