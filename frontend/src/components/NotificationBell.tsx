import { useEffect, useRef, useState } from 'react'
import { Bell, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/notifications/useNotifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative shrink-0"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => markAllRead()}>
                <Check className="mr-1 size-3.5" />
                Tout lu
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => clearAll()}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto p-2">
            {items.length === 0 ? (
              <li className="px-2 py-6 text-center text-sm text-muted-foreground">Aucune notification</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-muted',
                      !n.read && 'bg-primary/5',
                    )}
                    onClick={() => markRead(n.id)}
                  >
                    <p className="font-medium leading-snug text-foreground">{n.title}</p>
                    {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
