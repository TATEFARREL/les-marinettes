import { type FormEvent, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select-native'
import { useAuth } from '@/auth/useAuth'
import { apiFetch } from '@/api/client'

type Applicant = { id: number; full_name: string; email: string | null; phone: string | null }
type Application = {
  id: number
  applicant_id: number
  status: string
  school_year: string
  notes: string | null
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  reviewed: 'Examiné',
  accepted: 'Accepté',
  enrolled: 'Inscrit',
}

export default function AdmissionsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [applicantId, setApplicantId] = useState('')
  const [status, setStatus] = useState('draft')

  async function reload() {
    const [ra, rb] = await Promise.all([
      apiFetch('/api/admissions/applicants'),
      apiFetch('/api/admissions/applications'),
    ])
    if (ra.ok) setApplicants((await ra.json()) as Applicant[])
    if (rb.ok) setApplications((await rb.json()) as Application[])
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function addApplicant(e: FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    const res = await apiFetch('/api/admissions/applicants', {
      method: 'POST',
      body: JSON.stringify({
        full_name: name,
        email: email || null,
        phone: phone || null,
      }),
    })
    if (!res.ok) {
      toast.error('Impossible de créer le candidat.')
      return
    }
    setName('')
    setEmail('')
    setPhone('')
    toast.success('Candidat ajouté.')
    void reload()
  }

  async function addApplication(e: FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    const res = await apiFetch('/api/admissions/applications', {
      method: 'POST',
      body: JSON.stringify({
        applicant_id: Number(applicantId),
        status,
        school_year: '2026-2027',
      }),
    })
    if (!res.ok) {
      toast.error('Impossible de créer le dossier.')
      return
    }
    toast.success('Dossier créé.')
    void reload()
  }

  async function patchApp(id: number, newStatus: string) {
    if (!isAdmin) return
    const res = await apiFetch(`/api/admissions/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) void reload()
    else toast.error('Impossible de mettre à jour le statut.')
  }

  function applicantName(id: number): string {
    return applicants.find((a) => a.id === id)?.full_name ?? `ID ${id}`
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">Admissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Suivi des candidats et des dossiers d’inscription.</p>
      </div>

      {isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nouveau candidat</CardTitle>
              <CardDescription>Ajoutez une famille ou un parent avant d’ouvrir un dossier.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void addApplicant(e)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="c-name">Nom complet</Label>
                  <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-email">E-mail (facultatif)</Label>
                  <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-phone">Téléphone (facultatif)</Label>
                  <Input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <Button type="submit">Enregistrer le candidat</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nouveau dossier</CardTitle>
              <CardDescription>Liez un dossier à un candidat existant (voir la colonne ID dans le tableau).</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void addApplication(e)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="app-aid">Identifiant du candidat</Label>
                  <Input id="app-aid" inputMode="numeric" value={applicantId} onChange={(e) => setApplicantId(e.target.value)} required placeholder="ex. 1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="app-status">Statut initial</Label>
                  <Select id="app-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button type="submit">Créer le dossier</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Candidats</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3 font-medium">ID</th>
                <th className="p-3 font-medium">Nom</th>
                <th className="p-3 font-medium">E-mail</th>
                <th className="p-3 font-medium">Téléphone</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((a) => (
                <tr key={a.id} className="border-b border-border/80 last:border-0">
                  <td className="p-3 text-muted-foreground">{a.id}</td>
                  <td className="p-3 font-medium">{a.full_name}</td>
                  <td className="p-3">{a.email ?? '—'}</td>
                  <td className="p-3">{a.phone ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dossiers</CardTitle>
          <CardDescription>Modifiez le statut d’un dossier via le menu déroulant (administrateurs).</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 sm:p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="p-3 font-medium">ID</th>
                <th className="p-3 font-medium">Candidat</th>
                <th className="p-3 font-medium">Statut</th>
                <th className="p-3 font-medium">Année scolaire</th>
                {isAdmin ? <th className="p-3 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} className="border-b border-border/80 last:border-0">
                  <td className="p-3 text-muted-foreground">{a.id}</td>
                  <td className="p-3">{applicantName(a.applicant_id)}</td>
                  <td className="p-3">{STATUS_LABELS[a.status] ?? a.status}</td>
                  <td className="p-3">{a.school_year}</td>
                  {isAdmin ? (
                    <td className="p-3">
                      <Select
                        value={a.status}
                        onChange={(e) => void patchApp(a.id, e.target.value)}
                        className="min-w-[160px]"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  )
}
