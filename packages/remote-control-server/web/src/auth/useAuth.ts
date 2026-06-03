import { useState, useEffect, useCallback, useRef } from 'react'
import type { User } from 'oidc-client-ts'
import type { AuthState, AuthContextValue } from './context'
import {
  initUserManager,
  getUserManager,
  isOidcMode,
  login as oidcLogin,
  logout as oidcLogout,
  getUser,
  handleCallback,
} from './provider'

function extractDisplayName(user: User): string {
  const profile = user.profile as Record<string, unknown>
  return (
    (profile.preferred_username as string) ||
    (profile.name as string) ||
    (profile.email as string) ||
    (profile.sub as string) ||
    'User'
  )
}

export function useAuthProvider(): AuthContextValue {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    mode: 'uuid',
    displayName: '',
    userId: '',
    accessToken: null,
    error: null,
  })
  const initialized = useRef(false)

  const refreshUser = useCallback(async () => {
    const manager = getUserManager()
    if (!manager) return

    const user = await getUser()
    if (user && !user.expired) {
      setState({
        isAuthenticated: true,
        isLoading: false,
        user,
        mode: 'oidc',
        displayName: extractDisplayName(user),
        userId: user.profile.sub,
        accessToken: user.access_token,
        error: null,
      })
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        mode: 'oidc',
        isAuthenticated: false,
        user: null,
        accessToken: null,
      }))
    }
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    ;(async () => {
      try {
        const manager = await initUserManager()
        if (!manager) {
          // UUID mode — no OIDC
          setState(prev => ({ ...prev, isLoading: false, mode: 'uuid' }))
          return
        }

        // Check for callback
        if (window.location.pathname.includes('/auth/callback')) {
          const user = await handleCallback()
          if (user) {
            setState({
              isAuthenticated: true,
              isLoading: false,
              user,
              mode: 'oidc',
              displayName: extractDisplayName(user),
              userId: user.profile.sub,
              accessToken: user.access_token,
              error: null,
            })
            // Restore the pre-login path saved before OIDC redirect
            const savedPath =
              sessionStorage.getItem('rcs_pre_login_path') || '/code/'
            sessionStorage.removeItem('rcs_pre_login_path')
            window.history.replaceState(null, '', savedPath)
            // Trigger route re-parsing (replaceState doesn't fire popstate)
            window.dispatchEvent(new PopStateEvent('popstate'))
            return
          }
        }

        await refreshUser()
      } catch (err) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          mode: 'oidc',
          error: err instanceof Error ? err.message : String(err),
        }))
      }
    })()
  }, [refreshUser])

  // Listen for user loaded/unloaded events
  useEffect(() => {
    const manager = getUserManager()
    if (!manager) return

    const onUserLoaded = () => refreshUser()
    const onUserUnloaded = () => {
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        accessToken: null,
      }))
    }

    manager.events.addUserLoaded(onUserLoaded)
    manager.events.addUserUnloaded(onUserUnloaded)

    return () => {
      manager.events.removeUserLoaded(onUserLoaded)
      manager.events.removeUserUnloaded(onUserUnloaded)
    }
  }, [refreshUser])

  const loginFn = useCallback(async () => {
    if (isOidcMode()) {
      await oidcLogin()
    }
  }, [])

  const logoutFn = useCallback(async () => {
    if (isOidcMode()) {
      await oidcLogout()
    }
  }, [])

  return {
    ...state,
    login: loginFn,
    logout: logoutFn,
  }
}
