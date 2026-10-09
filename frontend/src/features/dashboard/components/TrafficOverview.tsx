import { useEffect, useState } from 'react'
import { BarChart3, Eye, Users } from 'lucide-react'
import { apiFetch } from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type TrafficSummary = {
  page_views: number
  visitors: number
  today: { page_views: number; visitors: number }
  daily: Array<{ date: string; page_views: number; visitors: number }>
  top_pages: Array<{ path: string; views: number }>
}

export function TrafficOverview() {
  const [summary, setSummary] = useState<TrafficSummary | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    void (async () => {
      const response = await apiFetch('/api/analytics/summary?days=30')
      if (!response.ok) {
        setError(true)
        return
      }
      setSummary((await response.json()) as TrafficSummary)
    })()
  }, [])

  const recent = summary?.daily.slice(-14) ?? []
  const maxViews = Math.max(1, ...recent.map((day) => day.page_views))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          Trafic du site
        </CardTitle>
        <CardDescription>Visites des 30 derniers jours, sans stockage d’adresse IP.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">Les statistiques ne sont pas disponibles pour le moment.</p>
        ) : !summary ? (
          <p className="text-sm text-muted-foreground">Chargement des statistiques…</p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric icon={Users} label="Visiteurs (30 j)" value={summary.visitors} />
              <Metric icon={Eye} label="Pages vues (30 j)" value={summary.page_views} />
              <Metric icon={BarChart3} label="Pages vues aujourd’hui" value={summary.today.page_views} />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pages vues — 14 derniers jours
              </p>
              <div className="flex h-28 items-end gap-1 rounded-lg bg-muted/40 p-3">
                {recent.map((day) => (
                  <div
                    key={day.date}
                    className="min-w-0 flex-1 rounded-t bg-primary/75"
                    style={{ height: `${Math.max(3, (day.page_views / maxViews) * 100)}%` }}
                    title={`${day.date} : ${day.page_views} pages vues`}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pages les plus consultées
              </p>
              {summary.top_pages.length ? (
                <ul className="divide-y divide-border">
                  {summary.top_pages.slice(0, 5).map((page) => (
                    <li key={page.path} className="flex items-center justify-between gap-4 py-2 text-sm">
                      <span className="truncate font-mono text-xs">{page.path}</span>
                      <span className="shrink-0 font-medium">{page.views}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Les premières visites apparaîtront ici.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value.toLocaleString('fr-FR')}</p>
    </div>
  )
}
