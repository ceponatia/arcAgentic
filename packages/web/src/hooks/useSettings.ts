import { useEffect, useRef, useState } from 'react'
import type { SettingSummary } from '../types.js'
import { getSettings } from '../api/client.js'

export interface SettingsState {
  loading: boolean
  error: string | null
  data: SettingSummary[] | null
}

export function useSettings() {
  const [state, setState] = useState<SettingsState>({ loading: true, error: null, data: null })
  const controllerRef = useRef<AbortController | null>(null)
  const fetchedRef = useRef(false)

  const fetchOnce = () => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    controllerRef.current?.abort()
    const ctrl = new AbortController()
    controllerRef.current = ctrl

    setState({ loading: true, error: null, data: null })
    getSettings(ctrl.signal)
      .then((json: SettingSummary[]) => {
        setState({ loading: false, error: null, data: json })
      })
      .catch((err: unknown) => {
        if ((err instanceof DOMException || err instanceof Error) && err.name === 'AbortError') return
        const message = (err as Error).message || 'Failed to load settings'
        setState({ loading: false, error: message, data: null })
      })
  }

  useEffect(() => {
    fetchOnce()
    return () => {
      controllerRef.current?.abort()
    }
  }, [])

  const retry = () => {
    fetchedRef.current = false
    fetchOnce()
  }

  return { ...state, retry }
}
