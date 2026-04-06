import { useContext } from 'react'
import { NotificationsContext } from '@/notifications/notifications-context'

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications outside NotificationsProvider')
  return ctx
}
