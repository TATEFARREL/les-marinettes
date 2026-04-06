import { type FormEvent, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Student = { id: number; full_name: string; application_id: number | null }
type Invoice = {
  id: number
  student_id: number
  total_cents: number
  status: string
  lines: { description: string; amount_cents: number }[]
}

function formatXaf(cents: number): string {
  return new Intl.NumberFormat('fr-CM', { style: 'decimal', maximumFractionDigits: 0 }).format(cents) + ' FCFA'
}

export default function FinancePage() {
  const [students, setStudents] = useState<Student[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [studentName, setStudentName] = useState('')
  const [appId, setAppId] = useState('')
  const [payStudent, setPayStudent] = useState('')
  const [payAmount, setPayAmount] = useState('')

  async function reload() {
    const [rs, ri] = await Promise.all([
      apiFetch('/api/finance/students'),
      apiFetch('/api/finance/invoices'),
    ])
    if (rs.ok) setStudents((await rs.json()) as Student[])
    if (ri.ok) setInvoices((await ri.json()) as Invoice[])
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function addStudent(e: FormEvent) {
    e.preventDefault()
    const res = await apiFetch('/api/finance/students', {
      method: 'POST',
      body: JSON.stringify({
        full_name: studentName,
        application_id: appId ? Number(appId) : null,
      }),
    })
    if (!res.ok) {
      toast.error('Impossible de créer l’élève (réservé aux administrateurs).')
      return
    }
    setStudentName('')
    setAppId('')
    toast.success('Élève enregistré.')
    void reload()
  }

  async function addPayment(e: FormEvent) {
    e.preventDefault()
    const amt = Math.round(Number(payAmount))
    const res = await apiFetch('/api/finance/payments', {
      method: 'POST',
      body: JSON.stringify({
        student_id: payStudent ? Number(payStudent) : null,
        amount_cents: Number.isFinite(amt) ? amt : 0,
        method: 'cash',
      }),
    })
    if (!res.ok) {
      toast.error('Impossible d’enregistrer le paiement.')
      return
    }
    toast.success('Paiement enregistré.')
    void reload()
  }

  async function downloadPaymentsCsv() {
    const res = await apiFetch('/api/finance/payments/export')
    if (!res.ok) {
      toast.error('Échec de l’export CSV.')
      return
    }
    toast.success('Téléchargement du CSV lancé.')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'payments.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary">Finance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Élèves, factures et paiements.</p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={() => void downloadPaymentsCsv()}>
          <Download className="size-4" />
          Télécharger les paiements (CSV)
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouvel élève</CardTitle>
            <CardDescription>Réservé aux administrateurs. Vous pouvez lier un dossier d’admission par son numéro.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void addStudent(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="st-name">Nom de l’élève</Label>
                <Input id="st-name" value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-app">N° de dossier d’admission (facultatif)</Label>
                <Input id="st-app" inputMode="numeric" value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="ex. 3" />
              </div>
              <Button type="submit">Créer l’élève</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enregistrer un paiement</CardTitle>
            <CardDescription>
              Indiquez le montant en <strong className="font-medium text-foreground">francs CFA</strong> (nombre entier, sans décimales).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void addPayment(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pay-st">Identifiant de l’élève</Label>
                <SelectStudent id="pay-st" value={payStudent} onChange={setPayStudent} students={students} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-amt">Montant (FCFA)</Label>
                <Input id="pay-amt" inputMode="numeric" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required placeholder="ex. 50000" />
              </div>
              <Button type="submit">Valider le paiement</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Élèves</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun élève pour le moment.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {students.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                    <span className="font-medium">{s.full_name}</span>
                    <span className="text-muted-foreground">
                      #{s.id}
                      {s.application_id != null ? ` · dossier ${s.application_id}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Factures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune facture.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {invoices.map((inv) => (
                  <li key={inv.id} className="px-3 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">Facture #{inv.id}</span>
                      <span className="text-muted-foreground">{inv.status}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      Élève #{inv.student_id} · {formatXaf(inv.total_cents)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

function SelectStudent({
  id,
  value,
  onChange,
  students,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  students: Student[]
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <option value="">— Choisir —</option>
      {students.map((s) => (
        <option key={s.id} value={String(s.id)}>
          #{s.id} — {s.full_name}
        </option>
      ))}
    </select>
  )
}
