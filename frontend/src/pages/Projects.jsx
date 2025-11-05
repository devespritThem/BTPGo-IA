import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'

export default function Projects() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await apiFetch('/projects')
      setItems(res.items || [])
    } catch (e) {
      setError('Chargement impossible');
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projets</h1>
        <button onClick={()=>nav('/projects/new')} className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700">Nouveau projet</button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Titre</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Créé</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p => (
              <tr key={p.id} className="border-t">
                <td className="p-3"><Link className="text-blue-600 underline" to={`/projects/${p.id}/overview`}>{p.title}</Link></td>
                <td className="p-3">{p.status}</td>
                <td className="p-3">{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</td>
              </tr>
            ))}
            {!items.length && !loading && <tr><td className="p-3 text-gray-500" colSpan={3}>Aucun projet</td></tr>}
            {loading && <tr><td className="p-3 text-gray-500" colSpan={3}>Chargement...</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

