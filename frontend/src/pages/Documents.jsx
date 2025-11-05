import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'

export default function Documents() {
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [type, setType] = useState('other')
  const [url, setUrl] = useState('')
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    try { const res = await apiFetch('/documents'); setItems(res.items||[]) } catch {}
  }
  useEffect(() => { load() }, [])
  useEffect(() => { (async()=>{ try{ const r = await apiFetch('/projects'); setProjects(r.items||[]) } catch{} })() }, [])

  async function onSubmit(e) {
    e.preventDefault(); setMsg(''); setLoading(true)
    try {
      await apiFetch('/ingest/document', { method: 'POST', body: { title, type, url, projectId: projectId||undefined } })
      setMsg('Document enregistré, traitement IA en file d\'attente')
      setTitle(''); setUrl(''); setProjectId(''); await load()
    } catch (e) { setMsg(e?.message || 'Erreur') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Documents</h1>
      <form onSubmit={onSubmit} className="flex gap-2 flex-wrap items-center">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre" className="border rounded px-3 py-2" />
        <select value={type} onChange={e=>setType(e.target.value)} className="border rounded px-3 py-2">
          <option value="contract">Contrat</option>
          <option value="pv">PV</option>
          <option value="devis">Devis</option>
          <option value="other">Autre</option>
        </select>
        <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="border rounded px-3 py-2">
          <option value="">Projet (optionnel)</option>
          {projects.map(p=> <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="URL (optionnel)" className="border rounded px-3 py-2 min-w-[240px]" />
        <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60" type="submit">{loading?'Ajout...':'Ajouter'}</button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </form>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Titre</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">URL</th>
              <th className="text-left p-3">Créé</th>
            </tr>
          </thead>
          <tbody>
            {items.map(d => (
              <tr key={d.id} className="border-t">
                <td className="p-3">{d.title}</td>
                <td className="p-3">{d.type}</td>
                <td className="p-3">{d.url ? <a className="underline text-blue-600" href={d.url} target="_blank">Lien</a> : '-'}</td>
                <td className="p-3">{d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}</td>
              </tr>
            ))}
            {!items.length && <tr><td className="p-3 text-gray-500" colSpan={4}>Aucun</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
