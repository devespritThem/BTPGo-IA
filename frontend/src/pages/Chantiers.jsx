import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { getToken, getOrgId } from '../lib/auth.js'
import Spinner from '../components/Spinner.jsx'
import { useToast } from '../components/ToastProvider.jsx'

export default function Chantiers() {
  const token = getToken();
  const orgId = getOrgId();
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [contact, setContact] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const { notify } = useToast()

  async function load() {
    setErr(''); setLoading(true)
    try {
      const res = await apiFetch('/chantiers', { token, orgId })
      setItems(res.data || [])
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function create() {
    try {
      await apiFetch('/chantiers', { method: 'POST', body: { name, address, contact }, token, orgId })
      setName(''); setAddress(''); setContact(''); notify('Chantier créé', 'success'); load()
    } catch (e) { setErr(e.message); notify(e.message, 'error') }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Chantiers</h1>
      {err && <p className="text-red-600 mb-2">{String(err)}</p>}
      <div className="bg-white rounded shadow p-4 mb-4 max-w-xl grid grid-cols-1 gap-2">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nom" className="border rounded px-2 py-1" />
        <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Adresse" className="border rounded px-2 py-1" />
        <input value={contact} onChange={e=>setContact(e.target.value)} placeholder="Contact" className="border rounded px-2 py-1" />
        <button onClick={create} className="bg-blue-600 text-white px-3 py-1 rounded">Créer</button>
      </div>
      {loading ? <div className="bg-white rounded shadow p-4 flex items-center gap-2"><Spinner /><span>Chargement…</span></div> : (
      <ul className="bg-white rounded shadow divide-y">
        {items.map(m => (
          <li key={m.id} className="p-3">
            <div className="font-medium">{m.name}</div>
            {(m.address || m.contact) && <div className="text-sm text-gray-600">{m.address} {m.contact && ` · ${m.contact}`}</div>}
          </li>
        ))}
      </ul>
      )}
    </div>
  )
}
