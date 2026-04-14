/**
 * Base URL for the public static site (HTML pages), not the React admin.
 *
 * - Production (same host as API): uses `window.location.origin`.
 * - Vite dev (`npm run dev`): defaults to `http://127.0.0.1:8000` where uvicorn serves `index.html`.
 * - Override anytime with `VITE_PUBLIC_SITE_URL` (no trailing slash).
 */
export function getPublicSiteBase(): string {
  const raw = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined
  if (raw && raw.trim()) return raw.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://127.0.0.1:8000'
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}

export function publicPageUrl(path: string): string {
  const base = getPublicSiteBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export const PUBLIC_SITE_PAGES = [
  { href: '/', label: 'Accueil' },
  { href: '/apropos', label: 'À propos' },
  { href: '/admissions', label: 'Admissions' },
  { href: '/galerie', label: 'Galerie' },
] as const
