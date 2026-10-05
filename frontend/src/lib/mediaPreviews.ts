import { isLikelyVideoUrl, resolveMediaUrl } from '@/lib/mediaUrl'

/** One tile on the dashboard media strip — URLs are resolved; UI shows section/label only. */
export type MediaPreviewItem = {
  /** Resolved URL safe for `<img src>` / `<video src>` */
  src: string
  /** e.g. "Accueil", "Galerie" */
  section: string
  /** Human context: carousel, event title, person name — never a file path */
  label: string
  kind: 'image' | 'video' | 'embed'
}

const MAX_ITEMS = 24

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

/** Collect image/video URLs from site JSON for dashboard thumbnails. */
export function extractMediaPreviews(payload: Record<string, unknown>): MediaPreviewItem[] {
  const out: MediaPreviewItem[] = []
  const seen = new Set<string>()

  function push(rawPath: string, meta: { section: string; label: string }) {
    if (out.length >= MAX_ITEMS) return
    const src = resolveMediaUrl(rawPath)
    if (!src || seen.has(src)) return
    seen.add(src)
    const embed =
      /youtube\.com|youtu\.be|vimeo\.com/i.test(rawPath) || /youtube\.com|youtu\.be|vimeo\.com/i.test(src)
    const video = embed || isLikelyVideoUrl(rawPath) || isLikelyVideoUrl(src)
    out.push({
      src,
      section: meta.section,
      label: meta.label.slice(0, 100),
      kind: embed ? 'embed' : video ? 'video' : 'image',
    })
  }

  const hero = asRecord(payload.hero)
  if (hero?.images && Array.isArray(hero.images)) {
    for (const u of hero.images) {
      if (typeof u === 'string') push(u, { section: 'Accueil', label: 'Carrousel principal' })
    }
  }

  const about = asRecord(payload.about)
  if (about) {
    if (typeof about.image1 === 'string' && about.image1) {
      push(about.image1, { section: 'Accueil', label: 'Bloc À propos (image 1)' })
    }
    if (typeof about.image2 === 'string' && about.image2 && about.image2 !== about.image1) {
      push(about.image2, { section: 'Accueil', label: 'Bloc À propos (image 2)' })
    }
  }

  const gallery = asRecord(payload.gallery)
  const events = gallery?.events
  if (Array.isArray(events)) {
    for (const ev of events) {
      const o = asRecord(ev)
      if (!o) continue
      const title = typeof o.title === 'string' ? o.title : 'Album'
      const media = o.media
      if (Array.isArray(media)) {
        for (const u of media) {
          if (typeof u === 'string') push(u, { section: 'Galerie accueil', label: title })
        }
      }
    }
  }

  const aboutPage = asRecord(payload.aboutPage)
  const dw = aboutPage ? asRecord(aboutPage.directorWord) : null
  if (dw && typeof dw.image === 'string' && dw.image) {
    push(dw.image, { section: 'Page À propos', label: 'Mot de la directrice' })
  }

  const core = aboutPage?.coreValues
  if (Array.isArray(core)) {
    for (const cv of core) {
      const o = asRecord(cv)
      if (o && typeof o.image === 'string' && o.image) {
        const t = typeof o.title === 'string' ? o.title : 'Valeur'
        push(o.image, { section: 'Valeurs', label: t })
      }
    }
  }

  const team = asRecord(payload.team)
  const members = team?.members
  if (Array.isArray(members)) {
    for (const m of members) {
      const o = asRecord(m)
      if (o && typeof o.image === 'string' && o.image) {
        const name = typeof o.name === 'string' ? o.name : 'Membre'
        push(o.image, { section: 'Équipe', label: name })
      }
    }
  }

  const full = payload.fullGallery
  if (Array.isArray(full)) {
    for (const item of full) {
      const o = asRecord(item)
      if (!o) continue
      const url = typeof o.url === 'string' ? o.url : ''
      if (!url) continue
      const title = typeof o.title === 'string' ? o.title : 'Média'
      const type = typeof o.type === 'string' ? o.type : 'image'
      if (type === 'video' || isLikelyVideoUrl(url)) {
        push(url, { section: 'Galerie (page)', label: title })
      } else {
        push(url, { section: 'Galerie (page)', label: title })
      }
    }
  }

  return out
}
