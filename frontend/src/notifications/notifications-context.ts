import { createContext } from 'react'
import type { AppNotification } from '@/notifications/notifications-service'

export type NotificationsCtx = {
  items: AppNotification[]
  unreadCount: number
  push: (input: { title: string; body?: string }) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
}

export const NotificationsContext = createContext<NotificationsCtx | null>(null)
