import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PUBLIC_SITE_PAGES, publicPageUrl } from '@/lib/publicSite'

export function PublicSitePreviewCard() {
  return (
    <Card className="border-primary/15 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Site public</CardTitle>
        <CardDescription>
          Aperçu tel que vu par les familles. En local, l’API doit servir les pages sur le port 8000, ou définissez{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">VITE_PUBLIC_SITE_URL</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        {PUBLIC_SITE_PAGES.map(({ href, label }) => (
          <Button key={href} variant="outline" size="sm" className="gap-2" asChild>
            <a href={publicPageUrl(href)} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              {label}
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
