import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'

export default function Alerts() {
  const [items, setItems] = useState([])
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [severity, setSeverity] = useState('')
  const [openOnly, setOpenOnly] = useState(true)

  async function load() {
    const qs = new URLSearchParams()
    if (projectId) qs.set('projectId', projectId)
    if (severity) qs.set('severity', severity)
    if (openOnly) qs.set('openOnly', '1')
    try { const res = await apiFetch(`/alerts?${qs.toString()}`); setItems(res.items||[]) } catch {}
  }
  useEffect(() => { (async()=>{ try{ const r = await apiFetch('/projects'); setProjects(r.items||[]) } catch{} })() }, [])
  useEffect(() => { load() }, [projectId, severity, openOnly])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Alertes</h1>
        <div className="flex items-center gap-2 text-sm">
          <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Tous projets</option>
            {projects.map(p=> <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select value={severity} onChange={e=>setSeverity(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Toute sévérité</option>
            <option value="info">Info</option>
            <option value="warning">Avert.</option>
            <option value="critical">Critique</option>
          </select>
          <label className="flex items-center gap-1"><input type="checkbox" checked={openOnly} onChange={e=>setOpenOnly(e.target.checked)} /> Ouvertes</label>
        </div>
      </div>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Titre</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Sévérité</th>
              <th className="text-left p-3">Créée</th>
            </tr>
          </thead>
          <tbody>
            {items.map(a => (
              <tr key={a.id} className="border-t">
                <td className="p-3">{a.title || a.message || a.type}</td>
                <td className="p-3">{a.type}</td>
                <td className="p-3">{a.severity}</td>
                <td className="p-3">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ''}</td>
              </tr>
            ))}
            {!items.length && <tr><td className="p-3 text-gray-500" colSpan={4}>Aucune alerte</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

