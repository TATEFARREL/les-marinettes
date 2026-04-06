import { Link } from 'react-router-dom'
import { ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PreviewTile } from '@/features/dashboard/media/PreviewTile'
import type { MediaPreviewItem } from '@/lib/mediaPreviews'

type Props = {
  items: MediaPreviewItem[]
  loading: boolean
  loadError: boolean
}

export function MediaSpotlightSection({ items, loading, loadError }: Props) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0 border-b border-border/60 bg-muted/30 pb-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ImageIcon className="size-5" />
            </span>
            Aperçu des médias
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-relaxed">
            Vignettes du contenu référencé (accueil, galerie, équipe). Les libellés indiquent l’emplacement sur le site — pas les chemins de fichiers.
          </CardDescription>
        </div>
        <Button variant="default" size="sm" className="shrink-0 gap-2 shadow-sm" asChild>
          <Link to="/gallery">
            <ImageIcon className="size-4" />
            Gérer les médias
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {loadError ? (
          <p className="text-sm text-destructive">Impossible de charger l’aperçu. Vérifiez la connexion et vos droits d’accès.</p>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5" aria-busy aria-label="Chargement des aperçus">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-muted sm:aspect-square" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun média pour l’instant. Ajoutez des images dans{' '}
              <Link to="/cms" className="font-medium text-primary underline-offset-4 hover:underline">
                Contenu
              </Link>{' '}
              ou{' '}
              <Link to="/gallery" className="font-medium text-primary underline-offset-4 hover:underline">
                Galerie
              </Link>
              .
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-muted-foreground">
              {items.length} élément{items.length > 1 ? 's' : ''} affiché{items.length > 1 ? 's' : ''} (aperçu limité aux derniers contenus).
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {items.map((item, i) => (
                <PreviewTile key={`${item.src}-${item.section}-${i}`} item={item} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
