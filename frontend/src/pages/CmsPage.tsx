import { type FormEvent, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  AboutPageForm,
  AboutForm,
  AdmissionsPageForm,
  HeroForm,
  StatsForm,
  TeamForm,
} from '@/components/cms/CmsForms'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/auth/useAuth'
import { apiFetch, deletedMediaNote } from '@/api/client'
import { notificationsService } from '@/notifications/notifications-service'
import {
  defaultAbout,
  defaultAboutPage,
  defaultAdmissionsPage,
  defaultHero,
  defaultTeam,
  parseAbout,
  parseAboutPage,
  parseAdmissionsPage,
  parseHero,
  parseStats,
  parseTeam,
  type About,
  type AboutPage,
  type AdmissionsPage,
  type Hero,
  type StatItem,
  type Team,
} from '@/lib/siteContent'

const ADMIN_TABS = ['hero', 'about', 'stats', 'team', 'aboutPage', 'admissionsPage'] as const

export default function CmsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const tabs = (isAdmin ? ADMIN_TABS : ['team']) as readonly string[]

  const [, setFull] = useState<Record<string, unknown> | null>(null)

  const [hero, setHero] = useState<Hero>(defaultHero)
  const [about, setAbout] = useState<About>(defaultAbout)
  const [stats, setStats] = useState<StatItem[]>([])
  const [team, setTeam] = useState<Team>(defaultTeam)
  const [aboutPage, setAboutPage] = useState<AboutPage>(defaultAboutPage)
  const [admissionsPage, setAdmissionsPage] = useState<AdmissionsPage>(defaultAdmissionsPage)

  const [tab, setTab] = useState<string>(isAdmin ? 'hero' : 'team')
  const [loading, setLoading] = useState(false)
  const [expertOverride, setExpertOverride] = useState<string | null>(null)
  const [expertOpen, setExpertOpen] = useState(false)

  useEffect(() => {
    void (async () => {
      const res = await apiFetch('/api/cms/site-content')
      if (!res.ok) return
      const data = (await res.json()) as Record<string, unknown>
      setFull(data)
      setHero(parseHero(data.hero))
      setAbout(parseAbout(data.about))
      setStats(parseStats(data.stats))
      setTeam(parseTeam(data.team))
      setAboutPage(parseAboutPage(data.aboutPage))
      setAdmissionsPage(parseAdmissionsPage(data.admissionsPage))
    })()
  }, [])

  function draftForSection(s: string): unknown {
    switch (s) {
      case 'hero':
        return hero
      case 'about':
        return about
      case 'stats':
        return stats
      case 'team':
        return team
      case 'aboutPage':
        return aboutPage
      case 'admissionsPage':
        return admissionsPage
      default:
        return {}
    }
  }

  function applyExpertJson(s: string, parsed: unknown) {
    switch (s) {
      case 'hero':
        setHero(parseHero(parsed))
        break
      case 'about':
        setAbout(parseAbout(parsed))
        break
      case 'stats':
        setStats(parseStats(parsed))
        break
      case 'team':
        setTeam(parseTeam(parsed))
        break
      case 'aboutPage':
        setAboutPage(parseAboutPage(parsed))
        break
      case 'admissionsPage':
        setAdmissionsPage(parseAdmissionsPage(parsed))
        break
      default:
        break
    }
  }

  const expertSerialized = JSON.stringify(draftForSection(tab), null, 2)
  const expertText = expertOverride ?? expertSerialized

  async function saveSection(s: string, e?: FormEvent) {
    e?.preventDefault()
    let payload: unknown = draftForSection(s)
    if (expertOpen && expertText.trim()) {
      try {
        payload = JSON.parse(expertText) as unknown
      } catch {
        toast.error('JSON invalide dans le mode expert.')
        return
      }
    }
    setLoading(true)
    const res = await apiFetch('/api/cms/site-content', {
      method: 'PATCH',
      body: JSON.stringify({ [s]: payload }),
    })
    setLoading(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(String((err as { detail?: unknown }).detail) || 'Erreur serveur')
      return
    }
    const next = (await res.json()) as Record<string, unknown>
    setFull(next)
    applyExpertJson(s, next[s])
    toast.success(`Section enregistrée.${deletedMediaNote(res)}`)
    notificationsService.push({ title: 'Contenu du site enregistré', body: tabLabel(s) })
  }

  function tabLabel(s: string): string {
    const labels: Record<string, string> = {
      hero: 'Accueil — bandeau',
      about: 'Accueil — à propos',
      stats: 'Accueil — chiffres',
      team: 'Organigramme',
      aboutPage: 'Page À propos',
      admissionsPage: 'Page Admissions',
    }
    return labels[s] ?? s
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Contenu du site</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? 'Modifiez les textes et images sans écrire de code. Les chemins d’image correspondent aux fichiers envoyés (voir onglet Galerie).'
            : 'En tant qu’enseignant, vous pouvez mettre à jour l’organigramme (équipe).'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>Enregistrez chaque onglet après vos modifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v)
              setExpertOverride(null)
            }}
          >
            <TabsList className="h-auto min-h-10 w-full justify-start gap-1 py-2">
              {tabs.map((t) => (
                <TabsTrigger key={t} value={t} className="text-xs sm:text-sm">
                  {tabLabel(t)}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((t) => (
              <TabsContent key={t} value={t} className="mt-4">
                <form
                  onSubmit={(e) => void saveSection(t, e)}
                  className="space-y-6"
                >
                  {t === 'hero' ? <HeroForm value={hero} onChange={setHero} /> : null}
                  {t === 'about' ? <AboutForm value={about} onChange={setAbout} /> : null}
                  {t === 'stats' ? <StatsForm value={stats} onChange={setStats} /> : null}
                  {t === 'team' ? <TeamForm value={team} onChange={setTeam} /> : null}
                  {t === 'aboutPage' ? <AboutPageForm value={aboutPage} onChange={setAboutPage} /> : null}
                  {t === 'admissionsPage' ? (
                    <AdmissionsPageForm value={admissionsPage} onChange={setAdmissionsPage} />
                  ) : null}

                  <details
                    className="group rounded-lg border border-border bg-muted/30"
                    onToggle={(e) => {
                      const open = (e.target as HTMLDetailsElement).open
                      setExpertOpen(open)
                      if (open) setExpertOverride(null)
                    }}
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                      Mode expert (JSON)
                    </summary>
                    <div className="border-t border-border p-4">
                      <p className="mb-2 text-xs text-muted-foreground">
                        Réservé au dépannage : le formulaire ci-dessus reste la méthode recommandée.
                      </p>
                      <Textarea
                        value={expertText}
                        onChange={(e) => setExpertOverride(e.target.value)}
                        rows={12}
                        className="font-mono text-xs"
                      />
                    </div>
                  </details>

                  <div className="flex flex-wrap gap-3">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Enregistrement…' : 'Enregistrer cette section'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            ))}
          </Tabs>

        </CardContent>
      </Card>
    </div>
  )
}
