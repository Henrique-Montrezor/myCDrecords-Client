import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ApiError, getProfile, isAbortError, login, logout, refreshSession, register, setAccessToken } from '../services/api'
import type { ApiUser } from '../types/api'

type SessionStatus = 'loading' | 'authenticated' | 'anonymous' | 'unavailable'

type SessionContextValue = {
  user: ApiUser | null
  avatarUrl: string | null
  status: SessionStatus
  signIn: (email: string, password: string) => Promise<ApiUser>
  signUp: (username: string, email: string, password: string, confirmPassword: string) => Promise<ApiUser>
  signOut: () => Promise<void>
  setAvatarUrl: (url: string | null) => void
  retry: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the refresh on retry.
  useEffect(() => {
    let active = true
    refreshSession()
      .then((response) => {
        if (!active) return
        if (response.user) {
          setUser(response.user)
          setStatus('authenticated')
        } else {
          setAccessToken(null)
          setStatus('anonymous')
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        setAccessToken(null)
        // Only a 401 means there is no session; rate limits and outages keep the cookie valid.
        setStatus(error instanceof ApiError && error.status === 401 ? 'anonymous' : 'unavailable')
      })
    return () => { active = false }
  }, [attempt])

  const retry = useCallback(() => {
    setStatus('loading')
    setAttempt((value) => value + 1)
  }, [])

  // The auth payload has no avatar; fetch the public profile once per signed-in user (initials are the fallback).
  const username = status === 'authenticated' ? user?.username : undefined
  useEffect(() => {
    setAvatarUrl(null)
    if (!username) return
    const controller = new AbortController()
    getProfile(username, controller.signal)
      .then((profile) => setAvatarUrl(profile.avatar_url))
      .catch((error: unknown) => {
        if (!isAbortError(error)) setAvatarUrl(null)
      })
    return () => controller.abort()
  }, [username])

  async function signIn(email: string, password: string) {
    const response = await login(email, password)
    if (!response.user) throw new Error('A API não retornou os dados do usuário.')
    setUser(response.user)
    setStatus('authenticated')
    return response.user
  }

  async function signUp(username: string, email: string, password: string, confirmPassword: string) {
    const response = await register(username, email, password, confirmPassword)
    if (!response.user) throw new Error('A API não retornou os dados do usuário.')
    setUser(response.user)
    setStatus('authenticated')
    return response.user
  }

  async function signOut() {
    try {
      await logout()
    } finally {
      setUser(null)
      setStatus('anonymous')
    }
  }

  return <SessionContext.Provider value={{ user, avatarUrl, status, signIn, signUp, signOut, setAvatarUrl, retry }}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession precisa estar dentro de SessionProvider')
  return context
}
