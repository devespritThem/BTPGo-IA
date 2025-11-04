const API = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL) || 'http://localhost:4000'

import { getToken as getAuthToken, clearToken as clearAuthToken } from '../lib/auth.js'

export async function apiFetch(path, { method = 'GET', headers = {}, body, token, orgId } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  const t = token || (typeof window !== 'undefined' ? (getAuthToken?.() || '') : '')
  if (t) h['Authorization'] = `Bearer ${t}`
  if (orgId) h['x-org-id'] = orgId
  const res = await fetch(`${API}${path}`, {
    method,
    headers: h,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  })
  const ct = res.headers.get('content-type') || ''
  const isJson = ct.includes('application/json')
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    if (isJson) {
      try {
        const j = await res.json()
        msg = j?.message || j?.error || JSON.stringify(j)
      } catch {}
    } else {
      try { msg = await res.text() } catch {}
    }
    if (res.status === 401) {
      try { clearAuthToken?.() } catch {}
      try { window.location.hash = '#/login' } catch {}
    }
    throw new Error(msg)
  }
  if (isJson) return res.json()
  return res.text()
}

export { API }

