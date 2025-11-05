import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'

export default function Photos() {
  const [items, setItems] = useState([])
  const [url, setUrl] = useState('')
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() { try { const res = await apiFetch('/photos'); setItems(res.items||[]) } catch {} }
  useEffect(() => { load() }, [])
  useEffect(() => { (async()=>{ try{ const r = await apiFetch('/projects'); setProjects(r.items||[]) } catch{} })() }, [])

  async function onSubmit(e) {
    e.preventDefault(); setMsg(''); setLoading(true)
    try {
      await apiFetch('/ingest/photo', { method: 'POST', body: { url, projectId: projectId||undefined } })
      setMsg('Photo enregistrée, tagging IA en file d\'attente')
      setUrl(''); setProjectId(''); await load()
    } catch (e) { setMsg(e?.message || 'Erreur') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Photos</h1>
      <form onSubmit={onSubmit} className="flex gap-2 flex-wrap items-center">
        <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Projet (optionnel)</option>
          {projects.map(p=> <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="URL photo" className="border rounded px-3 py-2 min-w-[260px]" />
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60" type="submit">{loading?'Ajout...':'Ajouter'}</button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </form>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(p => (
          <div key={p.id} className="bg-white rounded shadow overflow-hidden">
            {p.url ? <img src={p.url} alt="photo" className="w-full aspect-video object-cover" /> : <div className="h-40 bg-gray-100" />}
            <div className="p-2 text-xs text-gray-600">
              {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
              {Array.isArray(p.labels) && p.labels.length ? (
                <div className="mt-1 text-[10px] text-gray-500">Tags: {p.labels.join(', ')}</div>
              ) : null}
            </div>
          </div>
        ))}
        {!items.length && <div className="text-gray-500">Aucune photo</div>}
      </div>
    </div>
  )
}
