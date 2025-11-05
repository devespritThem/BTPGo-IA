import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { clearToken, getOrgId, setOrgId, getToken } from '../lib/auth.js'
import { apiFetch } from '../lib/api.js'

export default function Layout() {
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState('')
  const orgId = getOrgId()
  useEffect(() => {
    (async () => {
      try {
        const token = getToken()
        if (!token) return
        const me = await apiFetch('/auth/me', { token })
        setUserEmail(me?.user?.email || '')
      } catch {}
    })()
  }, [])
  async function showMe() {
    try {
      const token = getToken();
      if (!token) return alert('Non connecté');
      const me = await apiFetch('/auth/me', { token })
      alert(`Connecté: ${me.user.email}`)
    } catch (e) {
      alert('Impossible de récupérer le profil')
    }
  }

  function logout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  function onOrgChange(e) {
    setOrgId(e.target.value)
  }

  const navLink = ({ isActive }) => isActive ? 'text-blue-600 font-semibold' : 'text-gray-700'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-6">
          <Link to="/" className="font-bold">BTPGo</Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/" className={navLink}>Dashboard</NavLink>
            <NavLink to="/projects" className={navLink}>Projects</NavLink>
            <NavLink to="/marches" className={navLink}>Marchés</NavLink>
            <NavLink to="/devis" className={navLink}>Devis</NavLink>
            <NavLink to="/chantiers" className={navLink}>Chantiers</NavLink>
            <NavLink to="/billing" className={navLink}>Facturation</NavLink>
            <NavLink to="/org/members" className={navLink}>Membres</NavLink>
            <NavLink to="/demo" className={navLink}>Démo</NavLink>\n            <NavLink to="/status" className={navLink}>Statut</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            {userEmail ? <span className="text-gray-600">Logged in: {userEmail}</span> : null}
            <label className="text-gray-500">Org ID</label>
            <input defaultValue={orgId} onChange={onOrgChange} placeholder="auto" className="border rounded px-2 py-1 text-sm" />
            <button onClick={showMe} className="bg-blue-50 px-3 py-1 rounded text-blue-700 hover:bg-blue-100">Mon compte</button>
            <button onClick={logout} className="bg-gray-100 px-3 py-1 rounded text-gray-700 hover:bg-gray-200">Logout</button>
          </div>
        </div>
      </header>
      <main className="flex-1 bg-gray-50">
        <div className="mx-auto max-w-7xl p-4">
          <Outlet />
        </div>
      </main>
    </div>
  )
}


