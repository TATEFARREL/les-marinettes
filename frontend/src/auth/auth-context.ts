import { createContext } from 'react'

export type Role = 'admin' | 'teacher' | 'accountant'

export type AuthUser = { id: number; email: string; role: Role; is_active: boolean }

export type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
