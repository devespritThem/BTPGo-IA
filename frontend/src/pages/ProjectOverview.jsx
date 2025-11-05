import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'

export default function ProjectOverview() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`/projects/${id}`)
        setItem(res.item)
      } catch { setError('Projet introuvable') }
    })()
  }, [id])

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

