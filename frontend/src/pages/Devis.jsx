import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { getToken, getOrgId } from '../lib/auth.js'
import Spinner from '../components/Spinner.jsx'
import { useToast } from '../components/ToastProvider.jsx'

export default function Devis() {
  const token = getToken();
  const orgId = getOrgId();
  const [items, setItems] = useState([])
  const [ref, setRef] = useState('DV-')
  const [amount, setAmount] = useState(0)
  const [status, setStatus] = useState('draft')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const { notify } = useToast()

  async function load() {
    setErr(''); setLoading(true)
    try {
      const res = await apiFetch('/devis', { token, orgId })
      setItems(res.data || [])
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create() {
    try {
      await apiFetch('/devis', { method: 'POST', body: { ref, amount: Number(amount), status }, token, orgId })
      setRef('DV-'); setAmount(0); setStatus('draft'); notify('Devis créé', 'success'); load()
    } catch (e) { setErr(e.message); notify(e.message, 'error') }
  }

  async function createDemo() {
    try {
      await apiFetch('/demo/create/devis', { method: 'POST', token })
      notify('Devis de démo ajouté', 'success'); load()
    } catch (e) { notify('Échec démo', 'error') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Devis</h1>
        <button onClick={createDemo} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Créer un exemple</button>
      </div>
      {err && <p className="text-red-600 mb-2">{String(err)}</p>}
      <div className="bg-white rounded shadow p-4 mb-4 max-w-xl flex items-center gap-2">
        <input value={ref} onChange={e=>setRef(e.target.value)} placeholder="Référence" className="border rounded px-2 py-1" />
        <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Montant" className="border rounded px-2 py-1 w-32" />
        <select value={status} onChange={e=>setStatus(e.target.value)} className="border rounded px-2 py-1">
          <option value="draft">draft</option>
          <option value="sent">sent</option>
        </select>
        <button onClick={create} className="bg-blue-600 text-white px-3 py-1 rounded">Créer</button>
      </div>
      {loading ? (
        <div className="bg-white rounded shadow p-4 flex items-center gap-2"><Spinner /><span>Chargement…</span></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded shadow p-6 text-center">
          <p className="text-gray-600 mb-3">Aucun devis pour le moment.</p>
          <a href="/demo" className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Remplir la démo</a>
        </div>
      ) : (
        <ul className="bg-white rounded shadow divide-y">
          {items.map(m => (
            <li key={m.id} className="p-3">
              <div className="font-medium">{m.ref} <span className="text-xs text-gray-500">[{m.status}]</span></div>
              <div className="text-sm text-gray-600">{m.amount} €</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
