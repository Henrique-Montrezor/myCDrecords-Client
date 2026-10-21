import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError } from '../services/api'

export type Resource<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: unknown }

// `load` is read through a ref so callers can pass inline closures; `key` decides when to refetch.
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, key: string) {
  const [resource, setResource] = useState<Resource<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` and `attempt` are the explicit refetch triggers.
  useEffect(() => {
    const controller = new AbortController()
    setResource({ status: 'loading' })
    loadRef.current(controller.signal)
      .then((data) => setResource({ status: 'ready', data }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setResource({ status: 'error', error })
      })
    return () => controller.abort()
  }, [key, attempt])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  return { resource, reload, setResource }
}
