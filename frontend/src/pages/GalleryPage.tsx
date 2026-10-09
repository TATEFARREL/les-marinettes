import { type FormEvent, useEffect, useState } from 'react'
import { ImagePlus, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageListEditor } from '@/components/media/ImageListEditor'
import { FullGalleryEditor } from '@/features/gallery/components/FullGalleryEditor'
import { MediaLibrary } from '@/features/gallery/components/MediaLibrary'
import { apiFetch, deletedMediaNote, uploadMediaFile } from '@/api/client'
import { notificationsService } from '@/notifications/notifications-service'
import {
  defaultGallery,
  parseFullGallery,
  parseGallery,
  type FullGalleryItem,
  type GalleryEvent,
  type GallerySection,
} from '@/lib/siteContent'

export default function GalleryPage() {
  const [gallery, setGallery] = useState<GallerySection>(defaultGallery)
  const [fullItems, setFullItems] = useState<FullGalleryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [mediaRefresh, setMediaRefresh] = useState(0)

  useEffect(() => {
    void (async () => {
      const res = await apiFetch('/api/cms/site-content')
      if (!res.ok) return
      const data = (await res.json()) as Record<string, unknown>
      setGallery(parseGallery(data.gallery))
      setFullItems(parseFullGallery(data.fullGallery))
    })()
  }, [])

  async function saveGallery(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await apiFetch('/api/cms/site-content', {
      method: 'PATCH',
      body: JSON.stringify({ gallery }),
    })
    setLoading(false)
    if (!res.ok) {
      toast.error('Impossible d’enregistrer la galerie d’accueil.')
      return
    }
    toast.success(`Galerie d’accueil enregistrée.${deletedMediaNote(res)}`)
    setMediaRefresh((n) => n + 1)
    notificationsService.push({ title: 'Galerie enregistrée', body: 'Carrousel page d’accueil' })
  }

  async function saveFull(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await apiFetch('/api/cms/site-content', {
      method: 'PATCH',
      body: JSON.stringify({ fullGallery: fullItems }),
    })
    setLoading(false)
    if (!res.ok) {
      toast.error('Impossible d’enregistrer la page galerie.')
      return
    }
    toast.success(`Page galerie enregistrée.${deletedMediaNote(res)}`)
    setMediaRefresh((n) => n + 1)
    notificationsService.push({ title: 'Galerie enregistrée', body: 'Page galerie (grille)' })
  }

  async function onQuickUpload(file: File) {
    try {
      const { path } = await uploadMediaFile(file)
      setMediaRefresh((n) => n + 1)
      try {
        await navigator.clipboard.writeText(path)
        toast.success('Fichier enregistré. Le chemin a été copié dans le presse-papiers.')
      } catch {
        toast.success('Fichier enregistré sur le serveur.')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec de l’envoi du fichier.')
    }
  }

  function updateEvent(i: number, patch: Partial<GalleryEvent>) {
    setGallery((g) => ({
      ...g,
      events: g.events.map((ev, j) => (j === i ? { ...ev, ...patch } : ev)),
    }))
  }

  function addEvent() {
    setGallery((g) => ({
      ...g,
      events: [...g.events, { title: '', subtitle: '', media: [] }],
    }))
  }

  function removeEvent(i: number) {
    setGallery((g) => ({ ...g, events: g.events.filter((_, j) => j !== i) }))
  }

  function updateFullRow(i: number, patch: Partial<FullGalleryItem>) {
    setFullItems((rows) => rows.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  }

  function addFullRow() {
    setFullItems((rows) => [...rows, { type: 'image', category: 'evenements', url: '', title: '' }])
  }

  function removeFullRow(i: number) {
    setFullItems((rows) => rows.filter((_, j) => j !== i))
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Galerie</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajoutez des photos ou vidéos directement depuis votre ordinateur ; l’aperçu s’affiche dès que le fichier est sur le serveur.
        </p>
      </div>

      <Card className="border-dashed border-primary/25 bg-primary/5">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Upload className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Envoyer une photo ou une vidéo</CardTitle>
            <CardDescription>
              Envoi rapide : le chemin est copié automatiquement pour le coller si besoin. Dans les cartes ci-dessous, l’aperçu s’affiche dès que le média est enregistré.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer flex-wrap items-center gap-3">
            <Input
              type="file"
              accept="image/*,video/*"
              className="max-w-md cursor-pointer"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onQuickUpload(f)
                e.target.value = ''
              }}
            />
            <span className="text-xs text-muted-foreground">Formats courants : JPG, PNG, MP4…</span>
          </label>
        </CardContent>
      </Card>

      <Tabs defaultValue="home">
        <TabsList>
          <TabsTrigger value="home">Page d’accueil</TabsTrigger>
          <TabsTrigger value="full">Page galerie</TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImagePlus className="size-5 text-primary" />
                Événements (carrousel accueil)
              </CardTitle>
              <CardDescription>Chaque bloc est un album avec titre, sous-titre et liste de médias.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void saveGallery(e)} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Badge</Label>
                    <Input value={gallery.badge} onChange={(e) => setGallery({ ...gallery, badge: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Titre de la section</Label>
                    <Input value={gallery.title} onChange={(e) => setGallery({ ...gallery, title: e.target.value })} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Albums</p>
                  <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={addEvent}>
                    <Plus className="size-4" />
                    Ajouter un album
                  </Button>
                </div>

                {gallery.events.map((ev, i) => (
                  <div key={i} className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => removeEvent(i)}>
                        <Trash2 className="size-4" />
                        Supprimer cet album
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Titre de l’événement</Label>
                        <Input value={ev.title} onChange={(e) => updateEvent(i, { title: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Sous-titre</Label>
                        <Input value={ev.subtitle} onChange={(e) => updateEvent(i, { subtitle: e.target.value })} />
                      </div>
                    </div>
                    <ImageListEditor
                      label="Photos et vidéos"
                      hint="Envoyez des fichiers ou indiquez une URL externe."
                      items={ev.media.length ? ev.media : ['']}
                      onChange={(items) => updateEvent(i, { media: items.map((x) => x.trim()).filter(Boolean) })}
                    />
                  </div>
                ))}

                <Button type="submit" disabled={loading}>
                  {loading ? 'Enregistrement…' : 'Enregistrer la galerie d’accueil'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="full" className="mt-4">
          <FullGalleryEditor
            items={fullItems}
            loading={loading}
            onUpdate={updateFullRow}
            onAdd={addFullRow}
            onRemove={removeFullRow}
            onSubmit={saveFull}
          />
        </TabsContent>
      </Tabs>

      <MediaLibrary refreshKey={mediaRefresh} />

    </div>
  )
}
