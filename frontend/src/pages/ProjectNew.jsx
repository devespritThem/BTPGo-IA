import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api.js'

export default function ProjectNew() {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('draft')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function onSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await apiFetch('/projects', { method: 'POST', body: { title, status } })
      const id = res?.id
      if (id) return nav(`/projects/${id}/overview`)
      setError('Création échouée')
    } catch (e) {
      setError(e?.message || 'Erreur')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Nouveau projet</h1>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre du projet" className="w-full border rounded px-3 py-2" />
        <select value={status} onChange={e=>setStatus(e.target.value)} className="w-full border rounded px-3 py-2">
          <option value="draft">Brouillon</option>
          <option value="active">Actif</option>
          <option value="done">Terminé</option>
        </select>
        <div className="flex gap-3">
          <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60" type="submit">{loading?'Création...':'Créer'}</button>
          <button type="button" onClick={()=>nav(-1)} className="bg-gray-100 px-4 py-2 rounded">Annuler</button>
        </div>
      </form>
    </div>
  )
}

