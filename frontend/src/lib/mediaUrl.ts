/** Turn CMS paths (`images/uploads/...`) into a browser-usable URL. */
export function resolveMediaUrl(path: string): string {
  const p = path.trim()
  if (!p) return ''
  if (/^https?:\/\//i.test(p)) return p
  const base = String(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  const rel = p.startsWith('/') ? p : `/${p}`
  return base ? `${base}${rel}` : rel
}

export function isLikelyVideoUrl(url: string): boolean {
  const u = url.toLowerCase()
  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com')) return true
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(u)
}
