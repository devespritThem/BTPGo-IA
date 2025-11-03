import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { getToken, getOrgId } from '../lib/auth.js'
import Spinner from '../components/Spinner.jsx'
import { useToast } from '../components/ToastProvider.jsx'

export default function Marches() {
  const token = getToken();
  const orgId = getOrgId();
  const [items, setItems] = useState([])
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('draft')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const { notify } = useToast()

  async function load() {
    setErr(''); setLoading(true)
    try {
      const res = await apiFetch('/marches', { token, orgId })
      setItems(res.data || [])
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create() {
    try {
      await apiFetch('/marches', { method: 'POST', body: { title, status }, token, orgId })
      setTitle(''); setStatus('draft'); notify('Marché créé', 'success'); load()
    } catch (e) { setErr(e.message); notify(e.message, 'error') }
  }

  async function createDemo() {
    try {
      await apiFetch('/demo/create/marche', { method: 'POST', token })
      notify('Marché de démo ajouté', 'success'); load()
    } catch (e) { notify('Échec démo', 'error') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Marchés</h1>
        <button onClick={createDemo} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Créer un exemple</button>
      </div>
      {err && <p className="text-red-600 mb-2">{String(err)}</p>}
      <div className="bg-white rounded shadow p-4 mb-4 max-w-xl flex items-center gap-2">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Titre" className="border rounded px-2 py-1 flex-1" />
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded px-2 py-1">
          <option value="draft">draft</option>
          <option value="active">active</option>
        </select>
        <button onClick={create} className="bg-blue-600 text-white px-3 py-1 rounded">Créer</button>
      </div>
      {loading ? (
        <div className="bg-white rounded shadow p-4 flex items-center gap-2"><Spinner /><span>Chargement…</span></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded shadow p-6 text-center">
          <p className="text-gray-600 mb-3">Aucun marché pour le moment.</p>
          <a href="/demo" className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Remplir la démo</a>
        </div>
      ) : (
        <ul className="bg-white rounded shadow divide-y">
          {items.map(m => (
            <li key={m.id} className="p-3">
              <div className="font-medium">{m.title} <span className="text-xs text-gray-500">[{m.status}]</span></div>
              {m.notes && <div className="text-sm text-gray-600">{m.notes}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
