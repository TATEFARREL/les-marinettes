import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Banknote,
  FileUser,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeft,
  PenLine,
  X,
} from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
import { PublicSitePreview } from '@/components/PublicSitePreview'
import { Button } from '@/components/ui/button'
import { NotificationsProvider } from '@/notifications/NotificationsProvider'
import { cn } from '@/lib/utils'
import { useAuth } from '@/auth/useAuth'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  )

export default function Layout() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isTeacher = user?.role === 'teacher' || isAdmin
  const isFinance = user?.role === 'accountant' || isAdmin
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  return (
    <NotificationsProvider>
    <div className="flex min-h-svh bg-background">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card shadow-sm transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed && 'lg:w-[4.5rem]',
        )}
      >
        <div className="flex h-14 items-center gap-1 border-b border-border px-3 lg:px-4">
          <div className="min-w-0 flex-1">
            <span className={cn('block truncate font-semibold text-primary', collapsed && 'lg:hidden')}>Les Marinettes</span>
            <span className={cn('hidden font-semibold text-primary lg:block', !collapsed && 'lg:hidden')}>LM</span>
          </div>
          <NotificationBell />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
          >
            {collapsed ? <PanelLeft className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
            <X className="size-5" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <NavLink to="/" end className={navClass} onClick={() => setMobileOpen(false)}>
            <LayoutDashboard className="size-5 shrink-0" />
            {!collapsed && <span>Tableau de bord</span>}
          </NavLink>
          {isTeacher ? (
            <>
              <NavLink to="/cms" className={navClass} onClick={() => setMobileOpen(false)}>
                <PenLine className="size-5 shrink-0" />
                {!collapsed && <span>Contenu du site</span>}
              </NavLink>
              <NavLink to="/gallery" className={navClass} onClick={() => setMobileOpen(false)}>
                <ImageIcon className="size-5 shrink-0" />
                {!collapsed && <span>Galerie</span>}
              </NavLink>
            </>
          ) : null}
          <NavLink to="/admissions" className={navClass} onClick={() => setMobileOpen(false)}>
            <FileUser className="size-5 shrink-0" />
            {!collapsed && <span>Admissions</span>}
          </NavLink>
          {isFinance ? (
            <NavLink to="/finance" className={navClass} onClick={() => setMobileOpen(false)}>
              <Banknote className="size-5 shrink-0" />
              {!collapsed && <span>Finance</span>}
            </NavLink>
          ) : null}
        </nav>
        <div className={cn('px-3 pb-2', collapsed && 'lg:px-2')}>
          <PublicSitePreview collapsed={collapsed} />
        </div>
        <div className="border-t border-border p-3">
          <div className={cn('mb-2 rounded-lg bg-muted/50 px-3 py-2 text-xs', collapsed && 'lg:hidden')}>
            <p className="truncate font-medium text-foreground">{user?.email}</p>
            <p className="text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <Button type="button" variant="outline" className={cn('w-full gap-2', collapsed && 'lg:px-0')} onClick={logout}>
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span>Déconnexion</span>}
          </Button>
        </div>
      </aside>

      {mobileOpen ? (
        <button type="button" className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" aria-label="Fermer" onClick={() => setMobileOpen(false)} />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden">
          <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="size-5" />
          </Button>
          <span className="flex-1 font-semibold text-primary">Administration</span>
          <NotificationBell />
        </header>
        <main className="flex-1 bg-muted/40 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
    </NotificationsProvider>
  )
}
