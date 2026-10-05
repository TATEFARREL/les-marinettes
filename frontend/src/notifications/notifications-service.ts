/** In-dashboard notification feed: persisted in localStorage, no backend required. */

export type AppNotification = {
  id: string
  title: string
  body?: string
  read: boolean
  createdAt: number
}

const STORAGE_KEY = 'lesmarinettes.admin.notifications'
const MAX_ITEMS = 40

/** Bumps on every mutation so `useSyncExternalStore` can subscribe without unstable array snapshots. */
let snapshotVersion = 0
function bumpSnapshot() {
  snapshotVersion += 1
}

export function getNotificationsSnapshotVersion() {
  return snapshotVersion
}

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x) => x && typeof (x as AppNotification).id === 'string') as AppNotification[]
  } catch {
    return []
  }
}

function save(items: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function emit() {
  bumpSnapshot()
  window.dispatchEvent(new CustomEvent('lesmarinettes:notifications'))
}

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()
}

export const notificationsService = {
  getAll(): AppNotification[] {
    return load()
  },

  unreadCount(): number {
    return load().filter((n) => !n.read).length
  },

  push(input: { title: string; body?: string }): AppNotification {
    const item: AppNotification = {
      id: newId(),
      title: input.title,
      body: input.body,
      read: false,
      createdAt: Date.now(),
    }
    const next = [item, ...load()].slice(0, MAX_ITEMS)
    save(next)
    emit()
    return item
  },

  markRead(id: string) {
    const next = load().map((n) => (n.id === id ? { ...n, read: true } : n))
    save(next)
    emit()
  },

  markAllRead() {
    const next = load().map((n) => ({ ...n, read: true }))
    save(next)
    emit()
  },

  clearAll() {
    save([])
    emit()
  },

  subscribe(fn: () => void): () => void {
    const handler = () => fn()
    window.addEventListener('lesmarinettes:notifications', handler)
    return () => window.removeEventListener('lesmarinettes:notifications', handler)
  },

  /** One-time welcome when the inbox was empty (first visit). */
  seedWelcomeIfEmpty() {
    if (load().length > 0) return
    this.push({
      title: 'Bienvenue dans l’administration',
      body: 'Les notifications apparaissent ici lorsque vous enregistrez du contenu ou pour les alertes futures.',
    })
  },
}
