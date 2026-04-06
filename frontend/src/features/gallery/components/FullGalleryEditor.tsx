import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select-native'
import { MediaPicker } from '@/components/media/MediaPicker'
import type { FullGalleryItem } from '@/lib/siteContent'

type Props = {
  items: FullGalleryItem[]
  loading: boolean
  onUpdate: (index: number, patch: Partial<FullGalleryItem>) => void
  onAdd: () => void
  onRemove: (index: number) => void
  onSubmit: (e: FormEvent) => void
}

/**
 * Page galerie (galerie.html): image-first grid — aperçu large, métadonnées en dessous.
 * Les chemins restent éditables via MediaPicker (saisie ou envoi), pas comme colonne principale.
 */
export function FullGalleryEditor({ items, loading, onUpdate, onAdd, onRemove, onSubmit }: Props) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20">
        <CardTitle>Grille (page galerie.html)</CardTitle>
        <CardDescription className="max-w-2xl leading-relaxed">
          Chaque carte montre un aperçu du média. Indiquez le type, la catégorie de filtre et la légende affichée sur le site public.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/15 px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune vignette pour l’instant. Ajoutez une première image ou vidéo pour remplir la page galerie.
              </p>
              <Button type="button" variant="secondary" className="mt-4 gap-1" onClick={onAdd}>
                <Plus className="size-4" />
                Ajouter une vignette
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((row, i) => (
                <article
                  key={i}
                  className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow] hover:shadow-md"
                >
                  <div className="absolute right-2 top-2 z-10">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="size-9 border border-border/80 bg-background/95 shadow-sm backdrop-blur-sm"
                      onClick={() => onRemove(i)}
                      aria-label="Supprimer cette vignette"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="p-3 pt-14">
                    <MediaPicker value={row.url} onChange={(url) => onUpdate(i, { url })} />
                  </div>
                  <div className="mt-auto space-y-3 border-t border-border/80 bg-muted/25 p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                        <Select
                          value={row.type}
                          onChange={(e) =>
                            onUpdate(i, { type: e.target.value === 'video' ? 'video' : 'image' })
                          }
                          className="w-full"
                        >
                          <option value="image">Image</option>
                          <option value="video">Vidéo</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Catégorie</Label>
                        <Input
                          value={row.category}
                          onChange={(e) => onUpdate(i, { category: e.target.value })}
                          placeholder="maternelle, primaire…"
                          list="gallery-categories"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Titre / légende</Label>
                      <Input
                        value={row.title}
                        onChange={(e) => onUpdate(i, { title: e.target.value })}
                        placeholder="Texte sous la vignette sur le site"
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <datalist id="gallery-categories">
            <option value="maternelle" />
            <option value="primaire" />
            <option value="evenements" />
            <option value="sports" />
          </datalist>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" className="gap-1" onClick={onAdd}>
              <Plus className="size-4" />
              Ajouter une vignette
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement…' : 'Enregistrer la page galerie'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
