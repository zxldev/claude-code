import { jwtVerify, createRemoteJWKSet } from 'jose'
import { config, isOidcConfigured } from '../config'

/**
 * OIDC JWT verification using jose library.
 * Verifies tokens against the OIDC provider's JWKS endpoint.
 */

export interface OidcClaims {
  sub: string
  email?: string
  name?: string
  preferred_username?: string
  [key: string]: unknown
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (_jwks) return _jwks
  const jwksUri =
    config.oidc.jwksUri || `${config.oidc.issuer}/.well-known/jwks.json`
  _jwks = createRemoteJWKSet(new URL(jwksUri))
  return _jwks
}

/**
 * Verify an OIDC JWT access token or ID token.
 * Returns verified claims or null if invalid.
 */
export async function verifyOidcJwt(token: string): Promise<OidcClaims | null> {
  if (!isOidcConfigured()) return null

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: config.oidc.issuer,
      audience: config.oidc.audience || undefined,
      requiredClaims: ['sub', 'exp'],
    })

    return payload as OidcClaims
  } catch {
    return null
  }
}

/**
 * Extract a display name from OIDC claims.
 * Priority: preferred_username > name > email > sub
 */
export function getDisplayName(claims: OidcClaims): string {
  return claims.preferred_username || claims.name || claims.email || claims.sub
}
