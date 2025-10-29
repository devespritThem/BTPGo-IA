import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearToken, getOrgId, setOrgId } from '../lib/auth.js'

export default function Layout() {
  const navigate = useNavigate()
  const orgId = getOrgId()

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
            <NavLink to="/marches" className={navLink}>Marchés</NavLink>
            <NavLink to="/devis" className={navLink}>Devis</NavLink>
            <NavLink to="/chantiers" className={navLink}>Chantiers</NavLink>
            <NavLink to="/billing" className={navLink}>Facturation</NavLink>
            <NavLink to="/org/members" className={navLink}>Membres</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <label className="text-gray-500">Org ID</label>
            <input defaultValue={orgId} onChange={onOrgChange} placeholder="auto" className="border rounded px-2 py-1 text-sm" />
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

