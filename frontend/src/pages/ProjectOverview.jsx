import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'

export default function ProjectOverview() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [decisions, setDecisions] = useState([])
  const [loadingDec, setLoadingDec] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/projects/${id}`)
        setItem(res.item)
      } catch { setError('Projet introuvable') }
    })()
  }, [id])

  async function loadDecisions() {
    setLoadingDec(true)
    try {
      const res = await apiFetch(`/decisions?projectId=${encodeURIComponent(id)}&status=proposed`)
      setDecisions(res.items || [])
    } catch {}
    setLoadingDec(false)
  }

  useEffect(() => { loadDecisions() }, [id])

  async function act(decisionId, action) {
    try {
      await apiFetch(`/decisions/${decisionId}/${action}`, { method: 'POST' })
      await loadDecisions()
    } catch {}
  }

  if (error) return <div className="text-red-600">{error}</div>
  if (!item) return <div>Chargement...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{item.title}</h1>
        <span className="text-sm text-gray-600">Statut: {item.status}</span>
      </div>
      <div className="bg-white rounded shadow p-4">
        <div className="text-gray-500 text-sm">Aperçu</div>
        <p className="mt-2 text-gray-700">ID: {item.id}</p>
        <p className="text-gray-700">Créé: {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}</p>
      </div>
      <div className="bg-white rounded shadow p-4">
        <div className="flex items-center justify-between">
          <div className="text-gray-500 text-sm">Recommandations IA</div>
          <button onClick={loadDecisions} className="text-sm bg-gray-100 px-2 py-1 rounded">{loadingDec ? '...' : 'Rafraîchir'}</button>
        </div>
        <div className="mt-2 space-y-2">
          {decisions.map(d => (
            <div key={d.id} className="border rounded p-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{d.module} • {d.action}</div>
                {d.confidence!=null && <div className="text-gray-500">Confiance: {(d.confidence*100).toFixed(0)}%</div>}
              </div>
              <div className="text-gray-600">{d.payload?.message || d.payload?.summary || ''}</div>
              <div className="mt-2 flex gap-2">
                <button onClick={()=>act(d.id,'accept')} className="px-2 py-1 rounded bg-green-600 text-white">Accepter</button>
                <button onClick={()=>act(d.id,'reject')} className="px-2 py-1 rounded bg-red-600 text-white">Rejeter</button>
                <button onClick={()=>act(d.id,'apply')} className="px-2 py-1 rounded bg-blue-600 text-white">Appliquer</button>
              </div>
            </div>
          ))}
          {!decisions.length && <div className="text-gray-500 text-sm">Aucune recommandation proposée</div>}
        </div>
      </div>
      <div className="flex gap-3 text-sm">
        <Link to={`/projects/${id}/planning`} className="underline text-blue-600">Planning</Link>
        <Link to={`/projects/${id}/teams`} className="underline text-blue-600">Équipes</Link>
        <Link to={`/projects/${id}/files`} className="underline text-blue-600">Fichiers</Link>
      </div>
      <div className="bg-white rounded shadow p-4 text-gray-600">
        Sections à venir.
      </div>
    </div>
  )
}
