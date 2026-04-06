const API_BASE = import.meta.env.VITE_API_URL || ''

function getAccess(): string | null {
  return sessionStorage.getItem('lm_access')
}

export function setTokens(access: string, refresh: string) {
  sessionStorage.setItem('lm_access', access)
  sessionStorage.setItem('lm_refresh', refresh)
}

export function clearTokens() {
  sessionStorage.removeItem('lm_access')
  sessionStorage.removeItem('lm_refresh')
}

export async function refreshAccess(): Promise<boolean> {
  const r = sessionStorage.getItem('lm_refresh')
  if (!r) return false
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: r }),
  })
  if (!res.ok) return false
  const data = (await res.json()) as { access_token: string; refresh_token: string }
  setTokens(data.access_token, data.refresh_token)
  return true
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getAccess()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const isFormData = init.body instanceof FormData
  let res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  // Multipart bodies are consumed on first read — do not auto-retry FormData after refresh.
  if (res.status === 401 && path !== '/api/auth/refresh' && !isFormData) {
    const ok = await refreshAccess()
    if (ok) {
      const h2 = new Headers(init.headers)
      if (init.body && !(init.body instanceof FormData) && !h2.has('Content-Type')) {
        h2.set('Content-Type', 'application/json')
      }
      h2.set('Authorization', `Bearer ${getAccess()}`)
      res = await fetch(`${API_BASE}${path}`, { ...init, headers: h2 })
    }
  }
  return res
}

/** Upload a file to `/api/cms/upload`; rebuilds FormData on 401 so upload always works. */
export async function uploadMediaFile(file: File): Promise<{ path: string }> {
  const post = () => {
    const fd = new FormData()
    fd.append('file', file, file.name)
    const headers = new Headers()
    const token = getAccess()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(`${API_BASE}/api/cms/upload`, { method: 'POST', body: fd, headers })
  }

  let res = await post()
  if (res.status === 401) {
    const ok = await refreshAccess()
    if (ok) res = await post()
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const detail = (err as { detail?: unknown }).detail
    const msg =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail) && detail[0] && typeof (detail[0] as { msg?: string }).msg === 'string'
          ? (detail[0] as { msg: string }).msg
          : `Envoi échoué (${res.status})`
    throw new Error(msg)
  }
  return (await res.json()) as { path: string }
}
