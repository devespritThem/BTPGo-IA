const TOKEN_KEY = 'btpgo_token'
const ORG_KEY = 'btpgo_orgId'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getOrgId() {
  return localStorage.getItem(ORG_KEY) || ''
}

export function setOrgId(id) {
  if (id) localStorage.setItem(ORG_KEY, id)
}

