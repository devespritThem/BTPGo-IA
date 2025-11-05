import { useEffect, useState } from 'react'
import { API, apiFetch } from '../lib/api.js'

export default function Status() {
  const [apiOk, setApiOk] = useState(null)
  const [version, setVersion] = useState(null)
  const [aiOk, setAiOk] = useState(null)
  const [error, setError] = useState('')

  async function refresh() {
    setError('')
    try {
      const v = await apiFetch('/version')
      setVersion(v)
    } catch (e) {
      setVersion(null); setError('API /version indisponible')
    }
    try {
      const h = await apiFetch('/health')
      setApiOk(h?.status === 'ok')
    } catch { setApiOk(false) }
    try {
      const ai = await apiFetch('/ai/health')
      setAiOk(Boolean(ai))
    } catch { setAiOk(false) }
  }

  useEffect(() => { refresh() }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Statut Système</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="bg-white rounded shadow p-4 space-y-2">
        <div className="text-sm text-gray-500">API</div>
        <div>Base API: <code>{API}</code></div>
        <div>Health: {apiOk === null ? '...' : apiOk ? 'OK' : 'Indisponible'}</div>
        <div>Version: {version ? (version.version || 'inconnue') : '...'}</div>
      </div>
      <div className="bg-white rounded shadow p-4 space-y-2">
        <div className="text-sm text-gray-500">Moteur IA</div>
        <div>Health: {aiOk === null ? '...' : aiOk ? 'OK' : 'Indisponible'}</div>
        {!aiOk && <p className="text-sm text-gray-600">Vérifiez la variable backend <code>AI_ENGINE_URL</code> et l’accessibilité réseau.</p>}
      </div>
      <button onClick={refresh} className="bg-gray-100 px-3 py-2 rounded hover:bg-gray-200">Rafraîchir</button>
    </div>
  )
}

