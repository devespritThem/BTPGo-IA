import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { clearToken, getOrgId, setOrgId, getToken } from '../lib/auth.js'
import { apiFetch, API } from '../lib/api.js'
import { useToast } from './ToastProvider.jsx'
import Spinner from './Spinner.jsx'

export default function Layout() {
  const navigate = useNavigate()
  const { notify } = useToast()
  const [userEmail, setUserEmail] = useState('')
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(0)
  const [showDrop, setShowDrop] = useState(false)
  const [notifLoading, setNotifLoading] = useState(false)
  const [alertsCount, setAlertsCount] = useState(0)
  const [muteToasts, setMuteToasts] = useState(false)
  const esRef = useRef(null)
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

  async function loadNotifs() {
    try {
      setNotifLoading(true)
      const r = await apiFetch('/notifications?unread=1&limit=5')
      const items = r.items || []
      setNotifs(items)
      setUnread(items.filter(n => !n.readAt).length)
    } catch {}
    finally { setNotifLoading(false) }
  }

  async function loadAlerts() {
    try { const r = await apiFetch('/alerts?openOnly=1'); setAlertsCount((r.items||[]).length) } catch {}
  }

  useEffect(() => {
    loadNotifs(); loadAlerts()
    try {
      const t = getToken()
      if (t) {
        const es = new EventSource(`${API}/notifications/stream?token=${encodeURIComponent(t)}`)
        esRef.current = es
        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data||'{}')
            const items = data.items || []
            const news = data.news || []
            if (!muteToasts && Array.isArray(news)) {
              for (const n of news) { notify(n.title || n.message || 'Nouvelle notification', 'info') }
            }
            setNotifs(items)
            setUnread(items.filter(n => !n.readAt).length)
          } catch {}
        }
      }
    } catch {}
    const id = setInterval(loadAlerts, 60000)
    return () => { try { esRef.current && esRef.current.close() } catch {}; clearInterval(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muteToasts])

  async function markRead(id) {
    try { await apiFetch('/notifications/read', { method: 'POST', body: { ids: [id] } }); await loadNotifs() } catch {}
  }
  async function markAllRead() {
    try { await apiFetch('/notifications/read_all', { method: 'POST' }); await loadNotifs() } catch {}
  }

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

  function logout() { clearToken(); navigate('/login', { replace: true }) }
  function onOrgChange(e) { setOrgId(e.target.value) }
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
            <NavLink to="/documents" className={navLink}>Documents</NavLink>
            <NavLink to="/site/photos" className={navLink}>Photos</NavLink>
            <NavLink to="/billing" className={navLink}>Facturation</NavLink>
            <NavLink to="/org/members" className={navLink}>Membres</NavLink>
            <NavLink to="/demo" className={navLink}>Démo</NavLink>
            <NavLink to="/alerts" className={navLink}>Alertes{alertsCount>0 && <span className="ml-1 inline-block bg-red-600 text-white text-[10px] rounded-full px-1">{alertsCount}</span>}</NavLink>
            <NavLink to="/status" className={navLink}>Statut</NavLink>
          </nav>
          <div className="ml-auto relative flex items-center gap-2 text-sm">
            {userEmail ? <span className="text-gray-600">Connecté: {userEmail}</span> : null}
            <label className="text-gray-500">Org ID</label>
            <input defaultValue={orgId} onChange={onOrgChange} placeholder="auto" className="border rounded px-2 py-1 text-sm" />
            <div className="relative">
              <button onClick={()=>setShowDrop(v=>!v)} className="relative px-3 py-1 rounded hover:bg-gray-100" title="Notifications">
                <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" className="inline-block text-gray-700"><path fill="currentColor" d="M12 22a2 2 0 0 0 1.985-1.75L14 20h-4a2 2 0 0 0 1.85 1.994L12 22Zm6-6v-4a6 6 0 1 0-12 0v4l-2 2v1h16v-1l-2-2Z"/></svg>
                {unread>0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full px-1">{unread}</span>}
              </button>
              {showDrop && (
                <div className="absolute right-0 mt-1 w-80 bg-white border rounded shadow">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <div className="text-sm font-medium">Notifications</div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={muteToasts} onChange={e=>setMuteToasts(e.target.checked)} /> Muet</label>
                      <button onClick={markAllRead} className="text-xs text-blue-600 underline">Tout lu</button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {notifLoading && (!notifs || notifs.length===0) && (
                      <div className="px-3 py-4 flex items-center gap-2 text-sm text-gray-500"><Spinner /> Chargement...</div>
                    )}
                    {(notifs||[]).map(n => (
                      <div key={n.id} className="px-3 py-2 border-b text-sm">
                        <div className="font-medium">{n.title || n.type}</div>
                        <div className="text-gray-600 text-xs">{n.message || ''}</div>
                        <div className="mt-1 text-right"><button onClick={()=>markRead(n.id)} className="text-xs text-blue-600 underline">Marquer lu</button></div>
                      </div>
                    ))}
                    {(!notifs || notifs.length===0) && !notifLoading && <div className="px-3 py-2 text-sm text-gray-500">Aucune notification</div>}
                  </div>
                  <div className="px-3 py-2 text-right"><a href="/notifications" className="text-sm text-blue-600 underline" onClick={()=>setShowDrop(false)}>Tout voir {unread>0 ? `(${unread})` : ``}</a></div>
                </div>
              )}
            </div>
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

