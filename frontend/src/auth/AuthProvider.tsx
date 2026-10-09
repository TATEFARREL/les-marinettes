import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch, clearTokens, setTokens } from '@/api/client'
import { AuthContext, type AuthUser } from '@/auth/auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    const token = sessionStorage.getItem('lm_access')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    const res = await apiFetch('/api/auth/me')
    if (!res.ok) {
      setUser(null)
      clearTokens()
      setLoading(false)
      return
    }
    setUser((await res.json()) as AuthUser)
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refreshMe()
    }, 0)
    return () => window.clearTimeout(t)
  }, [refreshMe])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.status === 429) {
        const seconds = Number(res.headers.get('Retry-After')) || 900
        const minutes = Math.max(1, Math.ceil(seconds / 60))
        throw new Error(
          `Trop de tentatives de connexion. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`,
        )
      }
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          detail?: string | Array<{ msg?: string; loc?: unknown }>
        }
        let msg = 'Login failed'
        if (typeof err.detail === 'string') msg = err.detail
        else if (Array.isArray(err.detail) && err.detail[0]?.msg) msg = err.detail[0].msg
        throw new Error(msg)
      }
      const data = (await res.json()) as { access_token: string; refresh_token: string }
      setTokens(data.access_token, data.refresh_token)
      await refreshMe()
    },
    [refreshMe],
  )

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshMe }),
    [user, loading, login, logout, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
