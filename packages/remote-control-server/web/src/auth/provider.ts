import {
  UserManager,
  WebStorageStateStore,
  type UserManagerSettings,
  type User,
} from 'oidc-client-ts'

/**
 * OIDC authentication provider using oidc-client-ts.
 * Manages the UserManager lifecycle and provides auth state.
 */

let _userManager: UserManager | null = null
let _authConfig: AuthConfig | null = null

export interface AuthConfig {
  mode: 'oidc' | 'uuid'
  authority?: string
  client_id?: string
  redirect_uri?: string
  post_logout_redirect_uri?: string
  scope?: string
  audience?: string
}

export async function fetchAuthConfig(): Promise<AuthConfig> {
  if (_authConfig) return _authConfig
  const res = await fetch('/web/auth/config')
  _authConfig = await res.json()
  return _authConfig
}

export function isOidcMode(): boolean {
  return _authConfig?.mode === 'oidc'
}

export function getUserManager(): UserManager | null {
  return _userManager
}

export async function initUserManager(): Promise<UserManager | null> {
  const config = await fetchAuthConfig()
  if (config.mode !== 'oidc') return null

  const settings: UserManagerSettings = {
    authority: config.authority!,
    client_id: config.client_id!,
    redirect_uri: config.redirect_uri!,
    post_logout_redirect_uri: config.post_logout_redirect_uri,
    scope: config.scope || 'openid profile email',
    automaticSilentRenew: false,
    monitorSession: false,
    userStore: new WebStorageStateStore({ store: localStorage }),
  }

  _userManager = new UserManager(settings)
  return _userManager
}

export async function login(): Promise<void> {
  const manager = getUserManager()
  if (!manager) throw new Error('OIDC not configured')
  // Save current path so we can restore it after OIDC callback
  const currentPath = window.location.pathname + window.location.search
  if (currentPath !== '/code/auth/callback') {
    sessionStorage.setItem('rcs_pre_login_path', currentPath)
  }
  await manager.signinRedirect()
}

export async function handleCallback(): Promise<User | null> {
  const manager = getUserManager()
  if (!manager) return null
  try {
    return await manager.signinRedirectCallback()
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  const manager = getUserManager()
  if (!manager) return
  await manager.signoutRedirect()
}

export async function getUser(): Promise<User | null> {
  const manager = getUserManager()
  if (!manager) return null
  return manager.getUser()
}

export function getAccessToken(): string | null {
  const user = _userManager?.getUser
  // Synchronous access not available; use getUser() for async
  return null
}

/** Reset cached config (for testing or re-init) */
export function resetAuthConfig(): void {
  _authConfig = null
  _userManager = null
}
