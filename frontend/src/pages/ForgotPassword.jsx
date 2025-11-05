import { useState } from 'react'
import { apiFetch } from '../lib/api.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault(); setMsg(''); setLoading(true)
    try {
      await apiFetch('/auth/forgot', { method: 'POST', body: { email } })
      setMsg('Si un compte existe, un email a été envoyé.')
    } catch {
      setMsg('Demande échouée, réessayez plus tard.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded shadow p-6">
        <h1 className="text-xl font-semibold mb-4">Mot de passe oublié</h1>
        {msg && <p className="text-sm text-gray-700 mb-2">{msg}</p>}
        <form onSubmit={onSubmit} className="space-y-3">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
          <button disabled={loading} type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60">{loading?'Envoi...':'Envoyer le lien'}</button>
        </form>
      </div>
    </div>
  )
}

