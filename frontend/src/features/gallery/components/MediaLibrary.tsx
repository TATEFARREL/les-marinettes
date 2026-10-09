import { useCallback, useEffect, useState } from 'react'
import { FileText, FolderOpen, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { resolveMediaUrl } from '@/lib/mediaUrl'
import { cn } from '@/lib/utils'

type MediaItem = {
  name: string
  path: string
  content_type: string
  size: number
  created_at: string
  in_use: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

async function fetchMedia(): Promise<MediaItem[] | null> {
  const res = await apiFetch('/api/cms/media')
  return res.ok ? ((await res.json()) as MediaItem[]) : null
}

/** 404 counts as deleted: the file is already gone. */
async function deleteMedia(name: string): Promise<'deleted' | 'in_use' | 'failed'> {
  const res = await apiFetch(`/api/cms/media/${encodeURIComponent(name)}`, { method: 'DELETE' })
  if (res.status === 204 || res.status === 404) return 'deleted'
  return res.status === 409 ? 'in_use' : 'failed'
}

/** Uploaded files stored on the server; `refreshKey` reloads the list after uploads or saves. */
export function MediaLibrary({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const apply = useCallback((list: MediaItem[] | null) => {
    setError(list === null)
    if (list) setItems(list)
  }, [])

  const load = useCallback(async () => apply(await fetchMedia()), [apply])

  useEffect(() => {
    let active = true
    void fetchMedia().then((list) => {
      if (active) apply(list)
    })
    return () => {
      active = false
    }
  }, [apply, refreshKey])

  const unused = items?.filter((item) => !item.in_use) ?? []

  async function remove(item: MediaItem) {
    if (!window.confirm('Supprimer définitivement ce fichier du serveur ?')) return
    setBusy(item.name)
    const outcome = await deleteMedia(item.name)
    setBusy(null)
    if (outcome === 'deleted') toast.success('Fichier supprimé.')
    else if (outcome === 'in_use') {
      toast.error('Ce fichier est encore utilisé sur le site. Retirez-le du contenu, enregistrez, puis réessayez.')
    } else toast.error('Suppression impossible pour le moment.')
    await load()
  }

  async function removeUnused() {
    const count = unused.length
    if (!window.confirm(`Supprimer définitivement ${count} fichier${count > 1 ? 's' : ''} inutilisé${count > 1 ? 's' : ''} ?`)) {
      return
    }
    setBusy('*')
    let failed = 0
    for (const item of unused) {
      if ((await deleteMedia(item.name)) !== 'deleted') failed += 1
    }
    setBusy(null)
    if (failed) toast.error(`${failed} fichier${failed > 1 ? 's n’ont' : ' n’a'} pas pu être supprimé${failed > 1 ? 's' : ''}.`)
    else toast.success('Fichiers inutilisés supprimés.')
    await load()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="size-5 text-primary" />
            Médiathèque
          </CardTitle>
          <CardDescription>
            Fichiers envoyés depuis le tableau de bord. Un fichier remplacé ou retiré du site est supprimé
            automatiquement à l’enregistrement ; les fichiers jamais utilisés peuvent être supprimés ici.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            Actualiser
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-1"
            disabled={!unused.length || busy !== null}
            onClick={() => void removeUnused()}
          >
            {busy === '*' ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Supprimer les inutilisés ({unused.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">La médiathèque n’est pas disponible pour le moment.</p>
        ) : !items ? (
          <p className="text-sm text-muted-foreground">Chargement des fichiers…</p>
        ) : !items.length ? (
          <p className="text-sm text-muted-foreground">Aucun fichier envoyé pour l’instant.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <li key={item.name} className="overflow-hidden rounded-lg border border-border bg-muted/20">
                <div className="h-32 bg-background">
                  <MediaThumb item={item} />
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                        item.in_use ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {item.in_use ? 'Utilisé sur le site' : 'Inutilisé'}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatSize(item.size)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envoyé le {new Date(item.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1 text-destructive"
                    disabled={item.in_use || busy !== null}
                    title={item.in_use ? 'Retirez d’abord ce fichier du contenu du site.' : undefined}
                    onClick={() => void remove(item)}
                  >
                    {busy === item.name ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    Supprimer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function MediaThumb({ item }: { item: MediaItem }) {
  const url = resolveMediaUrl(item.path)
  if (item.content_type.startsWith('image/')) {
    return <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
  }
  if (item.content_type.startsWith('video/')) {
    return <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary"
    >
      <FileText className="size-8 opacity-60" />
      Ouvrir le document
    </a>
  )
}
