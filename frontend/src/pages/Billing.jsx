import { useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { getToken, getOrgId } from '../lib/auth.js'

export default function Billing() {
  const [plan, setPlan] = useState('starter')
  const [seats, setSeats] = useState(1)
  const token = getToken()
  const orgId = getOrgId()
  const [err, setErr] = useState('')

  async function checkout() {
    setErr('')
    try {
      const res = await apiFetch('/billing/checkout', { method: 'POST', body: { plan, seats }, token, orgId })
      window.location.href = res.url
    } catch (e) {
      setErr(e.message)
    }
  }

  async function portal() {
    setErr('')
    try {
      const res = await apiFetch('/billing/portal', { token, orgId })
      window.location.href = res.url
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Facturation</h1>
      {err && <p className="text-red-600 mb-2">{String(err)}</p>}
      <div className="bg-white rounded shadow p-4 max-w-md space-y-3">
        <div className="flex items-center gap-2">
          <label>Plan</label>
          <select value={plan} onChange={e=>setPlan(e.target.value)} className="border rounded px-2 py-1">
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label>Sièges</label>
          <input type="number" min={1} value={seats} onChange={e=>setSeats(parseInt(e.target.value)||1)} className="border rounded px-2 py-1 w-24" />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={checkout} className="bg-blue-600 text-white px-3 py-2 rounded">Souscrire</button>
          <button onClick={portal} className="bg-gray-100 px-3 py-2 rounded">Portail de gestion</button>
        </div>
      </div>
    </div>
  )
}

