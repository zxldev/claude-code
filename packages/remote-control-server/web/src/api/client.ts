import type {
  Session,
  Environment,
  ControlResponse,
  SessionEvent,
} from '../types'

/** API base URL — empty for same-origin, or full URL for CDN deployment (injected by Vite) */
const BASE: string = __RCS_API_BASE__

/** Active access token for Authorization header (set by auth context) */
let _accessToken: string | null = null

/** Active user ID for ownership queries (OIDC sub or UUID) */
let _userId: string | null = null

export function setAccessToken(token: string | null): void {
  _accessToken = token
}

export function getAccessToken(): string | null {
  return _accessToken
}

export function setUserId(id: string | null): void {
  _userId = id
}

export function getUserId(): string | null {
  return _userId
}

async function api<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  // Append userId as uuid query param for ownership resolution
  const sep = path.includes('?') ? '&' : '?'
  const userIdParam = _userId ? `${sep}uuid=${encodeURIComponent(_userId)}` : ''
  const url = `${BASE}${path}${userIdParam}`
  const opts: RequestInit = { method, headers }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(url, opts)
  const data = await res.json()
  if (!res.ok) {
    const err = data.error || { type: 'unknown', message: res.statusText }
    throw new Error(err.message || err.type)
  }
  return data as T
}

export function apiBind(sessionId: string) {
  return api<void>('POST', '/web/auth/bind', { sessionId })
}

export function apiFetchSessions() {
  return api<Session[]>('GET', '/web/sessions')
}

export function apiFetchAllSessions() {
  return api<Session[]>('GET', '/web/sessions/all')
}

export function apiFetchSession(id: string) {
  return api<Session>('GET', `/web/sessions/${id}`)
}

export function apiFetchSessionHistory(id: string) {
  return api<{ events: SessionEvent[] }>('GET', `/web/sessions/${id}/history`)
}

export function apiFetchEnvironments() {
  return api<Environment[]>('GET', '/web/environments')
}

export function apiSendEvent(sessionId: string, body: Record<string, unknown>) {
  return api<void>('POST', `/web/sessions/${sessionId}/events`, body)
}

export function apiSendControl(sessionId: string, body: ControlResponse) {
  return api<void>('POST', `/web/sessions/${sessionId}/control`, body)
}

export function apiInterrupt(sessionId: string) {
  return api<void>('POST', `/web/sessions/${sessionId}/interrupt`)
}

export function apiCreateSession(body: {
  title?: string
  environment_id?: string
}) {
  return api<Session>('POST', '/web/sessions', body)
}
