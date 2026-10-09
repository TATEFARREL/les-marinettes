import { DashboardWelcome } from '@/features/dashboard/components/DashboardWelcome'
import { ModuleShortcutGrid } from '@/features/dashboard/components/ModuleShortcutGrid'
import { PublicSitePreviewCard } from '@/features/dashboard/components/PublicSitePreviewCard'
import { TrafficOverview } from '@/features/dashboard/components/TrafficOverview'
import { getModuleShortcuts } from '@/features/dashboard/config/moduleShortcuts'
import { useDashboardMediaPreviews } from '@/features/dashboard/hooks/useDashboardMediaPreviews'
import { MediaSpotlightSection } from '@/features/dashboard/media/MediaSpotlightSection'
import { useAuth } from '@/auth/useAuth'

/**
 * Admin home: welcome, public links, optional media spotlight (editor roles), module shortcuts.
 * Data loading is delegated to `useDashboardMediaPreviews`; navigation config to `getModuleShortcuts`.
 */
export function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher' || isAdmin
  const isFinance = user?.role === 'accountant' || isAdmin

  const media = useDashboardMediaPreviews(isTeacher)
  const modules = getModuleShortcuts({ isTeacher, isFinance })

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <DashboardWelcome email={user?.email} role={user?.role} />

      <PublicSitePreviewCard />

      {isAdmin ? <TrafficOverview /> : null}

      {isTeacher ? (
        <MediaSpotlightSection items={media.items} loading={media.loading} loadError={media.error} />
      ) : null}

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Accès rapide
        </h2>
        <ModuleShortcutGrid modules={modules} />
      </section>
    </div>
  )
}
