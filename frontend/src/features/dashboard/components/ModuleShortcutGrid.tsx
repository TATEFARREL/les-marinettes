import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ModuleShortcut } from '@/features/dashboard/config/moduleShortcuts'
import { cn } from '@/lib/utils'

type Props = {
  modules: ModuleShortcut[]
}

export function ModuleShortcutGrid({ modules }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {modules.map((c) => {
        const Icon = c.icon
        return (
          <Link
            key={c.to}
            to={c.to}
            className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <Card className="h-full border-border/80 transition-all duration-200 group-hover:border-primary/25 group-hover:shadow-md group-focus-visible:shadow-md">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10 transition-transform group-hover:scale-[1.02]">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    {c.title}
                    <ArrowRight className="size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </CardTitle>
                  <CardDescription className="mt-1.5 leading-relaxed">{c.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <span className={cn('text-sm font-medium text-primary')}>Ouvrir</span>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
