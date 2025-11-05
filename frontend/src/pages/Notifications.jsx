import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'

export default function Notifications() {
  const [items, setItems] = useState([])
  const [onlyUnread, setOnlyUnread] = useState(true)

  async function load() {
    const qs = new URLSearchParams(); if (onlyUnread) qs.set('unread','1')
    try { const r = await apiFetch(`/notifications?${qs.toString()}`); setItems(r.items||[]) } catch {}
  }
  useEffect(() => { load() }, [onlyUnread])

  async function markAllRead() {
    try { await apiFetch('/notifications/read_all', { method: 'POST' }); await load() } catch {}
  }
  async function markRead(id) {
    try { await apiFetch('/notifications/read', { method: 'POST', body: { ids: [id] } }); await load() } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" checked={onlyUnread} onChange={e=>setOnlyUnread(e.target.checked)} /> Non lues</label>
          <button onClick={markAllRead} className="bg-gray-100 px-3 py-1 rounded">Tout marquer lu</button>
        </div>
      </div>
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr>
            <th className="text-left p-3">Titre</th>
            <th className="text-left p-3">Module</th>
            <th className="text-left p-3">Sévérité</th>
            <th className="text-left p-3">Date</th>
            <th className="text-left p-3"></th>
          </tr></thead>
          <tbody>
            {items.map(n => (
              <tr key={n.id} className="border-t">
                <td className="p-3">{n.title || n.message || n.type}</td>
                <td className="p-3">{n.module}</td>
                <td className="p-3">{n.severity||'-'}</td>
                <td className="p-3">{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</td>
                <td className="p-3 text-right"><button onClick={()=>markRead(n.id)} className="text-blue-600 underline">Marquer lu</button></td>
              </tr>
            ))}
            {!items.length && <tr><td className="p-3 text-gray-500" colSpan={5}>Aucune notification</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

