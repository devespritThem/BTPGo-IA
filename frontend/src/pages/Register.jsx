import { Link } from 'react-router-dom'
import { useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { setToken } from '../lib/auth.js'
import { useToast } from '../components/ToastProvider.jsx'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const { notify } = useToast()

  async function onSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!email || !password) { setErr('Email et mot de passe requis'); return }
    if (password !== confirm) { setErr('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    try {
      const res = await apiFetch('/auth/register', { method: 'POST', body: { email, password } })
      const token = res.accessToken || res.token
      if (token) setToken(token)
      notify('Compte créé avec succès', 'success')
      window.location.replace('/')
    } catch (e) {
      notify('Inscription échouée', 'error')
      setErr(e?.message || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded shadow p-6">
        <h1 className="text-xl font-semibold mb-4">Créer un compte</h1>
        {err && <p className="text-red-600 text-sm mb-2">{String(err)}</p>}
        <form onSubmit={onSubmit} className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" className="w-full border rounded px-3 py-2" />
          <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirmer le mot de passe" className="w-full border rounded px-3 py-2" />
          <button disabled={loading} type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-60">{loading?'Création…':'Créer mon compte'}</button>
        </form>
        <div className="mt-4 text-sm text-gray-600">
          <Link to="/login" className="underline">Déjà un compte ? Se connecter</Link>
        </div>
      </div>
    </div>
  )
}

