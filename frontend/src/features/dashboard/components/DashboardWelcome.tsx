import type { Role } from '@/auth/auth-context'
import { cn } from '@/lib/utils'

const ROLE_FR: Record<Role, string> = {
  admin: 'Administrateur',
  teacher: 'Équipe pédagogique',
  accountant: 'Comptabilité',
}

type Props = {
  email: string | undefined
  role: Role | undefined
}

function displayName(email: string | undefined): string {
  if (!email) return ''
  const local = email.split('@')[0] ?? ''
  return local.charAt(0).toUpperCase() + local.slice(1)
}

export function DashboardWelcome({ email, role }: Props) {
  const initial = email ? email.charAt(0).toUpperCase() : '?'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/8 via-card to-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-md"
            aria-hidden
          >
            {initial}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Tableau de bord</p>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Bonjour{displayName(email) ? `, ${displayName(email)}` : ''}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Gérez le contenu du site, les admissions et la scolarité depuis un seul endroit.
            </p>
          </div>
        </div>
        {role ? (
          <span
            className={cn(
              'inline-flex w-fit shrink-0 items-center rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm',
            )}
          >
            {ROLE_FR[role] ?? role}
          </span>
        ) : null}
      </div>
    </div>
  )
}
