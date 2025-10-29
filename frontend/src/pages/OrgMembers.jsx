import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { getToken, getOrgId } from '../lib/auth.js'

export default function OrgMembers() {
  const token = getToken()
  const orgId = getOrgId()
  const [items, setItems] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [err, setErr] = useState('')

  async function load() {
    setErr('')
    try {
      const res = await apiFetch('/org/members', { token, orgId })
      setItems(res.items || [])
    } catch (e) {
      setErr(e.message)
    }
  }
  useEffect(() => { load() }, [])

  async function addMember() {
    setErr('')
    try {
      await apiFetch('/org/members', { method: 'POST', body: { email, role }, token, orgId })
      setEmail('')
      load()
    } catch (e) { setErr(e.message) }
  }

  async function updateRole(userId, role) {
    try {
      await apiFetch(`/org/members/${userId}`, { method: 'PATCH', body: { role }, token, orgId })
      load()
    } catch (e) { setErr(e.message) }
  }

  async function removeMember(userId) {
    try {
      await apiFetch(`/org/members/${userId}`, { method: 'DELETE', token, orgId })
      load()
    } catch (e) { setErr(e.message) }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Membres de l'organisation</h1>
      {err && <p className="text-red-600 mb-2">{String(err)}</p>}
      <div className="bg-white rounded shadow p-4 mb-4 max-w-xl">
        <h2 className="font-semibold mb-2">Ajouter un membre</h2>
        <div className="flex items-center gap-2">
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@exemple.com" className="border rounded px-2 py-1 flex-1" />
          <select value={role} onChange={e=>setRole(e.target.value)} className="border rounded px-2 py-1">
            <option value="member">member</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
          <button onClick={addMember} className="bg-blue-600 text-white px-3 py-1 rounded">Ajouter</button>
        </div>
      </div>
      <div className="bg-white rounded shadow p-4 max-w-2xl">
        <h2 className="font-semibold mb-2">Liste des membres</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500"><th>Email</th><th>Rôle</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {items.map(m => (
              <tr key={m.userId} className="border-t">
                <td className="py-2">{m.email}</td>
                <td>
                  <select defaultValue={m.role} onChange={e=>updateRole(m.userId, e.target.value)} className="border rounded px-2 py-1">
                    <option value="member">member</option>
                    <option value="manager">manager</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <button onClick={()=>removeMember(m.userId)} className="text-red-600 hover:underline">Retirer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

