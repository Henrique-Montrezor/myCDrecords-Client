import { useEffect, useState } from 'react'
import type { Album } from '../types/api'
import { getTrendingAlbums, isAbortError } from '../services/api'

export type AlbumListState = { status: 'loading' | 'ready' | 'error'; albums: Album[] }

export function useTrendingAlbums() {
  const [state, setState] = useState<AlbumListState>({ status: 'loading', albums: [] })
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the request on retry.
  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading', albums: [] })
    getTrendingAlbums(controller.signal)
      .then((albums) => setState({ status: 'ready', albums }))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setState({ status: 'error', albums: [] })
      })
    return () => controller.abort()
  }, [attempt])

  return { ...state, reload: () => setAttempt((value) => value + 1) }
}
