import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { DocumentPicker } from '@/components/media/DocumentPicker'
import { ImageListEditor } from '@/components/media/ImageListEditor'
import { MediaPicker } from '@/components/media/MediaPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type {
  About,
  AboutPage,
  AboutValueBlock,
  AdmissionsPage,
  CoreValueBlock,
  Hero,
  StatItem,
  Team,
  TeamMember,
} from '@/lib/siteContent'

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  )
}

function linesToArray(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function arrayToLines(a: string[]): string {
  return a.join('\n')
}

export function HeroForm({ value, onChange }: { value: Hero; onChange: (v: Hero) => void }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Badge (petit texte au-dessus du titre)">
          <Input value={value.badge} onChange={(e) => onChange({ ...value, badge: e.target.value })} />
        </Field>
        <Field label="Titre principal">
          <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </Field>
      </div>
      <Field label="Sous-titre">
        <Textarea value={value.subtitle} onChange={(e) => onChange({ ...value, subtitle: e.target.value })} rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bouton principal">
          <Input value={value.primaryButton} onChange={(e) => onChange({ ...value, primaryButton: e.target.value })} />
        </Field>
        <Field label="Bouton secondaire">
          <Input
            value={value.secondaryButton}
            onChange={(e) => onChange({ ...value, secondaryButton: e.target.value })}
          />
        </Field>
      </div>
      <ImageListEditor
        label="Images du carrousel"
        hint="Envoyez des fichiers ou collez une URL. Les fichiers sont stockés sur le serveur (dossier images/uploads)."
        items={value.images}
        onChange={(images) => onChange({ ...value, images })}
      />
    </div>
  )
}

export function AboutForm({ value, onChange }: { value: About; onChange: (v: About) => void }) {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Badge">
          <Input value={value.badge} onChange={(e) => onChange({ ...value, badge: e.target.value })} />
        </Field>
        <Field label="Titre">
          <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </Field>
      </div>
      <Field label="Texte">
        <Textarea value={value.text} onChange={(e) => onChange({ ...value, text: e.target.value })} rows={6} />
      </Field>
      <Field label="Points forts" hint="Une ligne par puce">
        <Textarea
          value={arrayToLines(value.bullets)}
          onChange={(e) => onChange({ ...value, bullets: linesToArray(e.target.value) })}
          rows={5}
        />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Image 1">
          <MediaPicker value={value.image1} onChange={(image1) => onChange({ ...value, image1 })} />
        </Field>
        <Field label="Image 2">
          <MediaPicker value={value.image2} onChange={(image2) => onChange({ ...value, image2 })} />
        </Field>
      </div>
    </div>
  )
}

export function StatsForm({ value, onChange }: { value: StatItem[]; onChange: (v: StatItem[]) => void }) {
  function update(i: number, patch: Partial<StatItem>) {
    const next = value.map((row, j) => (j === i ? { ...row, ...patch } : row))
    onChange(next)
  }
  function add() {
    onChange([...value, { value: '', label: '' }])
  }
  function remove(i: number) {
    onChange(value.filter((_, j) => j !== i))
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Chiffres affichés sur la page d’accueil (ex. années d’expérience, nombre de classes).</p>
      {value.map((row, i) => (
        <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <Field label="Valeur" className="min-w-[100px] flex-1">
            <Input value={row.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="8+" />
          </Field>
          <Field label="Libellé" className="min-w-[180px] flex-[2]">
            <Input value={row.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Classes" />
          </Field>
          <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => remove(i)} aria-label="Supprimer">
            <Trash2 />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={add} className="gap-2">
        <Plus className="size-4" />
        Ajouter une statistique
      </Button>
    </div>
  )
}

function emptyMember(): TeamMember {
  return { image: '', name: '', role: '', desc: '', level: 3 }
}

export function TeamForm({ value, onChange }: { value: Team; onChange: (v: Team) => void }) {
  function updateMember(i: number, patch: Partial<TeamMember>) {
    const members = value.members.map((m, j) => (j === i ? { ...m, ...patch } : m))
    onChange({ ...value, members })
  }
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Badge">
          <Input value={value.badge} onChange={(e) => onChange({ ...value, badge: e.target.value })} />
        </Field>
        <Field label="Titre de la section">
          <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </Field>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">Membres</p>
          <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={() => onChange({ ...value, members: [...value.members, emptyMember()] })}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
        {value.members.map((m, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Personne {i + 1}</span>
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange({ ...value, members: value.members.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" />
                Retirer
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom">
                <Input value={m.name} onChange={(e) => updateMember(i, { name: e.target.value })} />
              </Field>
              <Field label="Rôle / fonction">
                <Input value={m.role} onChange={(e) => updateMember(i, { role: e.target.value })} />
              </Field>
            </div>
            <Field label="Photo">
              <MediaPicker value={m.image} onChange={(image) => updateMember(i, { image })} compact />
            </Field>
            <Field label="Description courte">
              <Textarea value={m.desc} onChange={(e) => updateMember(i, { desc: e.target.value })} rows={3} />
            </Field>
            <Field label="Niveau hiérarchique (1 = directeur, 2 = cadre, 3 = équipe)" hint="Utilisé pour l’organigramme visuel sur le site.">
              <Input
                type="number"
                min={1}
                max={5}
                value={m.level}
                onChange={(e) => updateMember(i, { level: Number(e.target.value) || 1 })}
              />
            </Field>
          </div>
        ))}
      </div>
    </div>
  )
}

function emptyValueBlock(): AboutValueBlock {
  return { title: '', desc: '', icon: '' }
}

function emptyCore(): CoreValueBlock {
  return { title: '', desc: '', image: '' }
}

export function AboutPageForm({ value, onChange }: { value: AboutPage; onChange: (v: AboutPage) => void }) {
  const dw = value.directorWord
  return (
    <div className="grid gap-8">
      <section className="space-y-4">
        <h4 className="text-sm font-semibold text-foreground">En-tête de la page</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Titre">
            <Input value={value.heroTitle} onChange={(e) => onChange({ ...value, heroTitle: e.target.value })} />
          </Field>
          <Field label="Sous-titre">
            <Input value={value.heroSubtitle} onChange={(e) => onChange({ ...value, heroSubtitle: e.target.value })} />
          </Field>
        </div>
      </section>
      <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
        <h4 className="text-sm font-semibold">Mot de la directrice / fondatrice</h4>
        <Field label="Titre du bloc">
          <Input value={dw.title} onChange={(e) => onChange({ ...value, directorWord: { ...dw, title: e.target.value } })} />
        </Field>
        <Field label="Texte">
          <Textarea
            value={dw.text}
            onChange={(e) => onChange({ ...value, directorWord: { ...dw, text: e.target.value } })}
            rows={6}
          />
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Photo">
            <MediaPicker
              value={dw.image}
              onChange={(image) => onChange({ ...value, directorWord: { ...dw, image } })}
            />
          </Field>
          <Field label="Nom affiché">
            <Input value={dw.name} onChange={(e) => onChange({ ...value, directorWord: { ...dw, name: e.target.value } })} />
          </Field>
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Grands blocs (mission, vision…)</h4>
          <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => onChange({ ...value, values: [...value.values, emptyValueBlock()] })}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
        {value.values.map((b, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange({ ...value, values: value.values.filter((_, j) => j !== i) })}>
                Retirer
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Icône (emoji ou symbole)">
                <Input value={b.icon} onChange={(e) => {
                  const values = value.values.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x))
                  onChange({ ...value, values })
                }} />
              </Field>
              <Field label="Titre" className="sm:col-span-2">
                <Input
                  value={b.title}
                  onChange={(e) => {
                    const values = value.values.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                    onChange({ ...value, values })
                  }}
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                value={b.desc}
                onChange={(e) => {
                  const values = value.values.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x))
                  onChange({ ...value, values })
                }}
                rows={4}
              />
            </Field>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Valeurs fondamentales (cartes avec image)</h4>
          <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => onChange({ ...value, coreValues: [...value.coreValues, emptyCore()] })}>
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
        {value.coreValues.map((b, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange({ ...value, coreValues: value.coreValues.filter((_, j) => j !== i) })}>
                Retirer
              </Button>
            </div>
            <Field label="Titre">
              <Input
                value={b.title}
                onChange={(e) => {
                  const coreValues = value.coreValues.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                  onChange({ ...value, coreValues })
                }}
              />
            </Field>
            <Field label="Texte">
              <Textarea
                value={b.desc}
                onChange={(e) => {
                  const coreValues = value.coreValues.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x))
                  onChange({ ...value, coreValues })
                }}
                rows={3}
              />
            </Field>
            <Field label="Image">
              <MediaPicker
                value={b.image}
                onChange={(image) => {
                  const coreValues = value.coreValues.map((x, j) => (j === i ? { ...x, image } : x))
                  onChange({ ...value, coreValues })
                }}
                compact
              />
            </Field>
          </div>
        ))}
      </section>
    </div>
  )
}

export function AdmissionsPageForm({
  value,
  onChange,
}: {
  value: AdmissionsPage
  onChange: (v: AdmissionsPage) => void
}) {
  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre de la page">
          <Input value={value.heroTitle} onChange={(e) => onChange({ ...value, heroTitle: e.target.value })} />
        </Field>
        <Field label="Sous-titre">
          <Input value={value.heroSubtitle} onChange={(e) => onChange({ ...value, heroSubtitle: e.target.value })} />
        </Field>
      </div>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Étapes d’inscription</h4>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-1"
            onClick={() => onChange({ ...value, steps: [...value.steps, { title: '', desc: '' }] })}
          >
            <Plus className="size-4" />
            Ajouter une étape
          </Button>
        </div>
        {value.steps.map((s, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-border p-4">
            <div className="flex justify-end">
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange({ ...value, steps: value.steps.filter((_, j) => j !== i) })}>
                Retirer
              </Button>
            </div>
            <Field label="Titre de l’étape">
              <Input
                value={s.title}
                onChange={(e) => {
                  const steps = value.steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                  onChange({ ...value, steps })
                }}
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={s.desc}
                onChange={(e) => {
                  const steps = value.steps.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x))
                  onChange({ ...value, steps })
                }}
                rows={3}
              />
            </Field>
          </div>
        ))}
      </section>
      <DocumentPicker
        value={value.downloadFile}
        onChange={(downloadFile) => onChange({ ...value, downloadFile })}
        label="Fichier pour le bouton « Télécharger » (PDF, Word, image…)"
        hint="Affiché sur la page publique Admissions à côté du formulaire. Laissez vide pour masquer le bouton de téléchargement."
      />
      <Field label="Libellé du bouton de téléchargement">
        <Input
          value={value.downloadLabel}
          onChange={(e) => onChange({ ...value, downloadLabel: e.target.value })}
          placeholder="Télécharger le dossier d’inscription"
        />
      </Field>
      <Field label="Documents et conditions requis" hint="Une ligne par élément de liste">
        <Textarea
          value={arrayToLines(value.requirements)}
          onChange={(e) => onChange({ ...value, requirements: linesToArray(e.target.value) })}
          rows={8}
        />
      </Field>
    </div>
  )
}
