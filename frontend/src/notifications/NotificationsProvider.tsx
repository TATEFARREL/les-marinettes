import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { NotificationsContext } from '@/notifications/notifications-context'
import {
  getNotificationsSnapshotVersion,
  notificationsService,
} from '@/notifications/notifications-service'

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const version = useSyncExternalStore(
    notificationsService.subscribe,
    getNotificationsSnapshotVersion,
    () => 0,
  )

  const items = useMemo(() => {
    void version
    return notificationsService.getAll()
  }, [version])

  useEffect(() => {
    notificationsService.seedWelcomeIfEmpty()
  }, [])

  const value = useMemo(
    () => ({
      items,
      unreadCount: items.filter((n) => !n.read).length,
      push: (input: { title: string; body?: string }) => {
        notificationsService.push(input)
      },
      markRead: (id: string) => {
        notificationsService.markRead(id)
      },
      markAllRead: () => {
        notificationsService.markAllRead()
      },
      clearAll: () => {
        notificationsService.clearAll()
      },
    }),
    [items],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
