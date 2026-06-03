export const config = {
  version: process.env.RCS_VERSION || '0.1.0',
  port: parseInt(process.env.RCS_PORT || '3000', 10),
  host: process.env.RCS_HOST || '0.0.0.0',
  apiKeys: (process.env.RCS_API_KEYS || '').split(',').filter(Boolean),
  baseUrl: process.env.RCS_BASE_URL || '',
  /** Web UI base path (Vite base). Defaults to '/code/'. Set to CDN URL for CDN deployment. */
  webBase: process.env.RCS_WEB_BASE || '/code/',
  /** Server-side route path for the Web UI SPA. Defaults to '/code/'. */
  webRoute: process.env.RCS_WEB_ROUTE || '/code/',
  pollTimeout: parseInt(process.env.RCS_POLL_TIMEOUT || '8', 10),
  heartbeatInterval: parseInt(process.env.RCS_HEARTBEAT_INTERVAL || '20', 10),
  jwtExpiresIn: parseInt(process.env.RCS_JWT_EXPIRES_IN || '3600', 10),
  disconnectTimeout: parseInt(process.env.RCS_DISCONNECT_TIMEOUT || '300', 10),
  webCorsOrigins: (process.env.RCS_WEB_CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  wsIdleTimeout: parseInt(process.env.RCS_WS_IDLE_TIMEOUT || '30', 10),
  wsKeepaliveInterval: parseInt(
    process.env.RCS_WS_KEEPALIVE_INTERVAL || '20',
    10,
  ),
  /** OIDC configuration for Web UI authentication */
  oidc: {
    issuer: process.env.RCS_OIDC_ISSUER || '',
    clientId: process.env.RCS_OIDC_CLIENT_ID || '',
    audience: process.env.RCS_OIDC_AUDIENCE || '',
    jwksUri: process.env.RCS_OIDC_JWKS_URI || '',
    scopes: (process.env.RCS_OIDC_SCOPES || 'openid profile email')
      .split(' ')
      .filter(Boolean),
  },
} as const

export function isOidcConfigured(): boolean {
  return !!(config.oidc.issuer && config.oidc.clientId)
}

export function getBaseUrl(): string {
  const url = config.baseUrl || `http://localhost:${config.port}`
  return url.replace(/\/+$/, '')
}
