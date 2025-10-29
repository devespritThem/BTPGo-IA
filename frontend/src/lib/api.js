const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'

export async function apiFetch(path, { method = 'GET', headers = {}, body, token, orgId } = {}) {
  const h = { 'Content-Type': 'application/json', ...headers }
  if (token) h['Authorization'] = `Bearer ${token}`
  if (orgId) h['x-org-id'] = orgId
  const res = await fetch(`${API}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

export { API }

