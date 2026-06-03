import { Hono } from 'hono'
import { config, isOidcConfigured } from '../../config'
import { storeBindSession } from '../../store'
import {
  resolveExistingWebSessionId,
  toWebSessionId,
} from '../../services/session'

const app = new Hono()

/** GET /web/auth/config — Return OIDC client configuration for frontend */
app.get('/config', c => {
  if (!isOidcConfigured()) {
    return c.json({ mode: 'uuid' })
  }

  const baseUrl = config.baseUrl || `http://localhost:${config.port}`
  return c.json({
    mode: 'oidc',
    authority: config.oidc.issuer,
    client_id: config.oidc.clientId,
    redirect_uri: `${baseUrl}/code/auth/callback`,
    post_logout_redirect_uri: `${baseUrl}/code/`,
    scope: config.oidc.scopes.join(' '),
    audience: config.oidc.audience || undefined,
  })
})

/** POST /web/bind — Bind a session to a user (UUID or OIDC sub) */
app.post('/bind', async c => {
  const body = await c.req.json()
  const sessionId = body.sessionId
  const uuid = c.req.query('uuid') || body.uuid

  if (!sessionId || !uuid) {
    return c.json({ error: 'sessionId and uuid are required' }, 400)
  }

  const resolvedSessionId = resolveExistingWebSessionId(sessionId)
  if (!resolvedSessionId) {
    return c.json({ error: 'Session not found' }, 404)
  }

  storeBindSession(resolvedSessionId, uuid)
  return c.json({ ok: true, sessionId: toWebSessionId(resolvedSessionId) })
})

export default app
