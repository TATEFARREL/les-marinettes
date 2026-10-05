/** Shapes aligned with `content.json` / FastAPI CMS patch payloads. */

export type Hero = {
  badge: string
  title: string
  subtitle: string
  images: string[]
  primaryButton: string
  secondaryButton: string
}

export type About = {
  badge: string
  title: string
  text: string
  bullets: string[]
  image1: string
  image2: string
}

export type StatItem = { value: string; label: string }

export type TeamMember = {
  image: string
  name: string
  role: string
  desc: string
  level: number
}

export type Team = {
  badge: string
  title: string
  members: TeamMember[]
}

export type AboutValueBlock = { title: string; desc: string; icon: string }
export type CoreValueBlock = { title: string; desc: string; image: string }

export type AboutPage = {
  heroTitle: string
  heroSubtitle: string
  directorWord: {
    title: string
    text: string
    name: string
    image: string
  }
  values: AboutValueBlock[]
  coreValues: CoreValueBlock[]
}

export type AdmissionsPage = {
  heroTitle: string
  heroSubtitle: string
  steps: { title: string; desc: string }[]
  requirements: string[]
  /** Relative path e.g. `images/uploads/form.pdf` or absolute URL */
  downloadFile: string
  /** Button label on the public admissions page */
  downloadLabel: string
}

export type GalleryEvent = { title: string; subtitle: string; media: string[] }
export type GallerySection = { badge: string; title: string; events: GalleryEvent[] }
export type FullGalleryItem = { type: 'image' | 'video'; category: string; url: string; title: string }

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x ?? ''))
}

export const defaultHero = (): Hero => ({
  badge: '',
  title: '',
  subtitle: '',
  images: [],
  primaryButton: '',
  secondaryButton: '',
})

export function parseHero(v: unknown): Hero {
  const o = asRecord(v)
  return {
    badge: String(o.badge ?? ''),
    title: String(o.title ?? ''),
    subtitle: String(o.subtitle ?? ''),
    images: asStringArray(o.images),
    primaryButton: String(o.primaryButton ?? ''),
    secondaryButton: String(o.secondaryButton ?? ''),
  }
}

export const defaultAbout = (): About => ({
  badge: '',
  title: '',
  text: '',
  bullets: [],
  image1: '',
  image2: '',
})

export function parseAbout(v: unknown): About {
  const o = asRecord(v)
  return {
    badge: String(o.badge ?? ''),
    title: String(o.title ?? ''),
    text: String(o.text ?? ''),
    bullets: asStringArray(o.bullets),
    image1: String(o.image1 ?? ''),
    image2: String(o.image2 ?? ''),
  }
}

export function parseStats(v: unknown): StatItem[] {
  if (!Array.isArray(v)) return []
  return v.map((row) => {
    const o = asRecord(row)
    return { value: String(o.value ?? ''), label: String(o.label ?? '') }
  })
}

export const defaultTeam = (): Team => ({ badge: '', title: '', members: [] })

export function parseTeam(v: unknown): Team {
  const o = asRecord(v)
  const membersRaw = o.members
  const members: TeamMember[] = Array.isArray(membersRaw)
    ? membersRaw.map((m) => {
        const r = asRecord(m)
        return {
          image: String(r.image ?? ''),
          name: String(r.name ?? ''),
          role: String(r.role ?? ''),
          desc: String(r.desc ?? ''),
          level: Number(r.level) || 1,
        }
      })
    : []
  return {
    badge: String(o.badge ?? ''),
    title: String(o.title ?? ''),
    members,
  }
}

export const defaultAboutPage = (): AboutPage => ({
  heroTitle: '',
  heroSubtitle: '',
  directorWord: { title: '', text: '', name: '', image: '' },
  values: [],
  coreValues: [],
})

export function parseAboutPage(v: unknown): AboutPage {
  const o = asRecord(v)
  const dw = asRecord(o.directorWord)
  const valuesRaw = o.values
  const values: AboutValueBlock[] = Array.isArray(valuesRaw)
    ? valuesRaw.map((x) => {
        const r = asRecord(x)
        return {
          title: String(r.title ?? ''),
          desc: String(r.desc ?? ''),
          icon: String(r.icon ?? ''),
        }
      })
    : []
  const cvRaw = o.coreValues
  const coreValues: CoreValueBlock[] = Array.isArray(cvRaw)
    ? cvRaw.map((x) => {
        const r = asRecord(x)
        return {
          title: String(r.title ?? ''),
          desc: String(r.desc ?? ''),
          image: String(r.image ?? ''),
        }
      })
    : []
  return {
    heroTitle: String(o.heroTitle ?? ''),
    heroSubtitle: String(o.heroSubtitle ?? ''),
    directorWord: {
      title: String(dw.title ?? ''),
      text: String(dw.text ?? ''),
      name: String(dw.name ?? ''),
      image: String(dw.image ?? ''),
    },
    values,
    coreValues,
  }
}

export const defaultAdmissionsPage = (): AdmissionsPage => ({
  heroTitle: '',
  heroSubtitle: '',
  steps: [],
  requirements: [],
  downloadFile: '',
  downloadLabel: 'Télécharger le dossier d’inscription',
})

export function parseAdmissionsPage(v: unknown): AdmissionsPage {
  const o = asRecord(v)
  const stepsRaw = o.steps
  const steps = Array.isArray(stepsRaw)
    ? stepsRaw.map((x) => {
        const r = asRecord(x)
        return { title: String(r.title ?? ''), desc: String(r.desc ?? '') }
      })
    : []
  return {
    heroTitle: String(o.heroTitle ?? ''),
    heroSubtitle: String(o.heroSubtitle ?? ''),
    steps,
    requirements: asStringArray(o.requirements),
    downloadFile: String(o.downloadFile ?? ''),
    downloadLabel: String(o.downloadLabel ?? 'Télécharger le dossier d’inscription'),
  }
}

export const defaultGallery = (): GallerySection => ({ badge: '', title: '', events: [] })

export function parseGallery(v: unknown): GallerySection {
  const o = asRecord(v)
  const ev = o.events
  const events: GalleryEvent[] = Array.isArray(ev)
    ? ev.map((x) => {
        const r = asRecord(x)
        return {
          title: String(r.title ?? ''),
          subtitle: String(r.subtitle ?? ''),
          media: asStringArray(r.media),
        }
      })
    : []
  return {
    badge: String(o.badge ?? ''),
    title: String(o.title ?? ''),
    events,
  }
}

export function parseFullGallery(v: unknown): FullGalleryItem[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => {
    const r = asRecord(x)
    const type = r.type === 'video' ? 'video' : 'image'
    return {
      type,
      category: String(r.category ?? ''),
      url: String(r.url ?? ''),
      title: String(r.title ?? ''),
    }
  })
}
