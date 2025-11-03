import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api.js'
import { getToken } from '../lib/auth.js'

export default function Demo() {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [counts, setCounts] = useState({ marches: 0, chantiers: 0, devis: 0 })
  const [latest, setLatest] = useState({ marches: [], chantiers: [], devis: [] })

  async function refresh() {
    try {
      const data = await apiFetch('/demo/overview', { token: getToken() })
      setCounts(data)
      const [m, c, d] = await Promise.all([
        apiFetch('/demo/list/marche', { token: getToken() }),
        apiFetch('/demo/list/chantier', { token: getToken() }),
        apiFetch('/demo/list/devis', { token: getToken() }),
      ])
      setLatest({ marches: m.items||[], chantiers: c.items||[], devis: d.items||[] })
    } catch (e) {
      setMsg('Impossible de récupérer les compteurs')
    }
  }

  async function seed() {
    setLoading(true); setMsg('')
    try {
      const data = await apiFetch('/demo/seed', { method: 'POST', token: getToken() })
      setMsg('Données de démo insérées')
      await refresh()
    } catch (e) {
      setMsg('Insertion échouée')
    } finally {
      setLoading(false)
    }
  }
  async function seedFull() {
    setLoading(true); setMsg('')
    try {
      await apiFetch('/demo/seed_full', { method: 'POST', token: getToken() })
      setMsg('Données de démo (x15) insérées')
      await refresh()
    } catch (e) {
      setMsg('Insertion (x15) échouée')
    } finally { setLoading(false) }
  }
  async function clearDemo() {
    setLoading(true); setMsg('')
    try {
      const data = await apiFetch('/demo/clear', { method: 'POST', token: getToken() })
      setMsg('Données de démo vidées')
      await refresh()
    } catch (e) {
      setMsg('Nettoyage échoué')
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Démo — Données pré-remplies</h1>
      {msg && <div className="text-sm text-gray-700">{msg}</div>}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow"><div className="text-gray-500 text-sm">Marchés</div><div className="text-2xl font-bold">{counts.marches}</div></div>
        <div className="p-4 bg-white rounded shadow"><div className="text-gray-500 text-sm">Chantiers</div><div className="text-2xl font-bold">{counts.chantiers}</div></div>
        <div className="p-4 bg-white rounded shadow"><div className="text-gray-500 text-sm">Devis</div><div className="text-2xl font-bold">{counts.devis}</div></div>
      </div>
      <div className="flex gap-3 flex-wrap">
        <button disabled={loading} onClick={seed} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60">
          {loading ? 'Remplissage…' : 'Remplir les données de démo'}
        </button>
        <button disabled={loading} onClick={seedFull} className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 disabled:opacity-60">Remplir 15 éléments</button>
        <button disabled={loading} onClick={clearDemo} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-60">Vider la démo</button>
        <button disabled={loading} onClick={async()=>{setLoading(true);setMsg('');try{await apiFetch('/demo/create/marche',{method:'POST',token:getToken()});setMsg('Marché ajouté');await refresh()}catch{setMsg('Échec marché')}finally{setLoading(false)}}} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60">+ Marché</button>
        <button disabled={loading} onClick={async()=>{setLoading(true);setMsg('');try{await apiFetch('/demo/create/chantier',{method:'POST',token:getToken()});setMsg('Chantier ajouté');await refresh()}catch{setMsg('Échec chantier')}finally{setLoading(false)}}} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-60">+ Chantier</button>
        <button disabled={loading} onClick={async()=>{setLoading(true);setMsg('');try{await apiFetch('/demo/create/devis',{method:'POST',token:getToken()});setMsg('Devis ajouté');await refresh()}catch{setMsg('Échec devis')}finally{setLoading(false)}}} className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700 disabled:opacity-60">+ Devis</button>
      </div>
      <p className="text-sm text-gray-500">Le bouton ci-dessus ajoute un petit jeu de données pour tester rapidement l’interface.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded shadow p-3">
          <div className="font-semibold mb-2">Derniers Marchés</div>
          <ul className="text-sm space-y-1">
            {latest.marches.map((x)=> <li key={x.id}>{x.title} <span className="text-gray-500">[{x.status}]</span></li>)}
            {!latest.marches.length && <li className="text-gray-500">Aucun</li>}
          </ul>
        </div>
        <div className="bg-white rounded shadow p-3">
          <div className="font-semibold mb-2">Derniers Chantiers</div>
          <ul className="text-sm space-y-1">
            {latest.chantiers.map((x)=> <li key={x.id}>{x.name} <span className="text-gray-500">{x.address||''}</span></li>)}
            {!latest.chantiers.length && <li className="text-gray-500">Aucun</li>}
          </ul>
        </div>
        <div className="bg-white rounded shadow p-3">
          <div className="font-semibold mb-2">Derniers Devis</div>
          <ul className="text-sm space-y-1">
            {latest.devis.map((x)=> <li key={x.id}>{x.ref} <span className="text-gray-500">[{x.status}]</span> — {x.amount} €</li>)}
            {!latest.devis.length && <li className="text-gray-500">Aucun</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
