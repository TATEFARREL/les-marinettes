import { useEffect, useState } from 'react'
import { apiFetch } from '@/api/client'
import { extractMediaPreviews, type MediaPreviewItem } from '@/lib/mediaPreviews'

type State = {
  loading: boolean
  items: MediaPreviewItem[]
  error: boolean
}

/**
 * Loads CMS payload and maps it to dashboard media tiles (resolved URLs + labels).
 */
export function useDashboardMediaPreviews(enabled: boolean): State {
  const [state, setState] = useState<State>(() => ({
    loading: Boolean(enabled),
    items: [],
    error: false,
  }))

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    const id = window.setTimeout(() => {
      setState({ loading: true, items: [], error: false })
      void (async () => {
        const res = await apiFetch('/api/cms/site-content')
        if (cancelled) return
        if (!res.ok) {
          setState({ loading: false, items: [], error: true })
          return
        }
        const data = (await res.json()) as Record<string, unknown>
        setState({
          loading: false,
          items: extractMediaPreviews(data),
          error: false,
        })
      })()
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [enabled])

  if (!enabled) {
    return { loading: false, items: [], error: false }
  }
  return state
}
