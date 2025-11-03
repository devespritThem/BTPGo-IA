const TOKEN_KEY = 'btpgo_token'
const ORG_KEY = 'btpgo_orgId'

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : ''
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY) || ''
}

export function setToken(t) {
  if (t) {
    localStorage.setItem(TOKEN_KEY, t)
    try {
      const isHttps = window.location.protocol === 'https:'
      document.cookie = `${TOKEN_KEY}=${encodeURIComponent(t)}; Path=/; SameSite=Lax; ${isHttps ? 'Secure' : ''}`.trim()
    } catch {}
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  try { document.cookie = `${TOKEN_KEY}=; Max-Age=0; Path=/; SameSite=Lax`; } catch {}
}

export function getOrgId() {
  return localStorage.getItem(ORG_KEY) || ''
}

export function setOrgId(id) {
  if (id) localStorage.setItem(ORG_KEY, id)
}

