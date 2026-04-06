import { ExternalLink } from 'lucide-react'
import { PUBLIC_SITE_PAGES, publicPageUrl } from '@/lib/publicSite'
import { cn } from '@/lib/utils'

export function PublicSitePreview({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('rounded-lg border border-border/80 bg-muted/30', collapsed && 'lg:border-0 lg:bg-transparent lg:p-0')}>
      <div className={cn('px-3 py-2', collapsed && 'lg:hidden')}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Site public</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Ouvre dans un nouvel onglet</p>
      </div>
      <ul className={cn('flex flex-col gap-0.5 p-2 pt-0', collapsed && 'lg:p-1')}>
        {PUBLIC_SITE_PAGES.map(({ href, label }) => (
          <li key={href}>
            <a
              href={publicPageUrl(href)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted/80',
                collapsed && 'lg:justify-center lg:px-0',
              )}
              title={collapsed ? label : undefined}
            >
              <ExternalLink className="size-4 shrink-0 text-primary" />
              {!collapsed && <span>{label}</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
