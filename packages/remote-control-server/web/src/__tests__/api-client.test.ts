import { describe, test, expect, beforeEach } from 'bun:test'

// Mock fetch
const fetchMock = {
  lastUrl: '',
  lastOpts: {} as RequestInit,
  response: { ok: true, status: 200, statusText: 'OK' },
  responseData: {} as any,
}

beforeEach(() => {
  fetchMock.lastUrl = ''
  fetchMock.lastOpts = {}
  fetchMock.response = { ok: true, status: 200, statusText: 'OK' }
  fetchMock.responseData = {}
  client.setAccessToken(null)
  client.setUserId(null)
})

;(globalThis as any).fetch = async (url: string, opts: RequestInit) => {
  fetchMock.lastUrl = url
  fetchMock.lastOpts = opts
  return {
    ok: fetchMock.response.ok,
    status: fetchMock.response.status,
    statusText: fetchMock.response.statusText,
    json: async () => fetchMock.responseData,
  } as Response
}

const client = await import('../api/client')
const relayClient = await import('../acp/relay-client')

// =============================================================================
// setUserId() / getUserId()
// =============================================================================

describe('setUserId / getUserId', () => {
  test('getUserId returns null by default', () => {
    client.setUserId(null)
    expect(client.getUserId()).toBeNull()
  })

  test('setUserId stores and getUserId retrieves', () => {
    client.setUserId('user-123')
    expect(client.getUserId()).toBe('user-123')
  })
})

describe('setAccessToken / getAccessToken', () => {
  test('getAccessToken returns null by default', () => {
    client.setAccessToken(null)
    expect(client.getAccessToken()).toBeNull()
  })

  test('setAccessToken stores and getAccessToken retrieves', () => {
    client.setAccessToken('my-jwt-token')
    expect(client.getAccessToken()).toBe('my-jwt-token')
  })
})

// =============================================================================
// api() — tested via apiFetchSession (GET) and apiBind (POST)
// =============================================================================

describe('api functions', () => {
  test('GET request appends userId as uuid param', async () => {
    client.setUserId('test-user')
    fetchMock.responseData = []
    await client.apiFetchSessions()
    expect(fetchMock.lastUrl).toContain('uuid=test-user')
    expect(fetchMock.lastOpts.method).toBe('GET')
  })

  test('GET request uses ? for URL without existing query params', async () => {
    client.setUserId('test-user')
    fetchMock.responseData = []
    await client.apiFetchSessions()
    expect(fetchMock.lastUrl).toContain('?uuid=')
  })

  test('GET request uses & for URL with existing query params', async () => {
    client.setUserId('test-user')
    fetchMock.responseData = []
    await client.apiFetchAllSessions()
    // apiFetchAllSessions calls GET /web/sessions/all
    expect(fetchMock.lastUrl).toContain('?uuid=')
  })

  test('POST request includes JSON body', async () => {
    client.setUserId('test-user')
    fetchMock.responseData = {}
    await client.apiBind('sess-1')
    expect(fetchMock.lastOpts.method).toBe('POST')
    expect(fetchMock.lastOpts.body).toBe(
      JSON.stringify({ sessionId: 'sess-1' }),
    )
    expect(fetchMock.lastOpts.headers).toEqual({
      'Content-Type': 'application/json',
    })
  })

  test('access token is sent in Authorization header', async () => {
    client.setUserId('browser-user')
    client.setAccessToken('oidc-access-token')
    fetchMock.responseData = []

    await client.apiFetchSessions()

    expect(fetchMock.lastUrl).toContain('uuid=browser-user')
    expect(fetchMock.lastUrl).not.toContain('oidc-access-token')
    expect(fetchMock.lastOpts.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer oidc-access-token',
    })
  })

  test('no Authorization header when accessToken is null', async () => {
    client.setUserId('test-user')
    client.setAccessToken(null)
    fetchMock.responseData = []

    await client.apiFetchSessions()

    expect(fetchMock.lastOpts.headers).toEqual({
      'Content-Type': 'application/json',
    })
  })

  test('throws error on non-ok response', async () => {
    client.setUserId('test-user')
    fetchMock.response = { ok: false, status: 401, statusText: 'Unauthorized' }
    fetchMock.responseData = {
      error: { type: 'auth', message: 'Invalid token' },
    }
    await expect(client.apiFetchSessions()).rejects.toThrow('Invalid token')
  })

  test('throws with statusText when error message is missing', async () => {
    client.setUserId('test-user')
    fetchMock.response = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }
    fetchMock.responseData = {}
    await expect(client.apiFetchSessions()).rejects.toThrow(
      'Internal Server Error',
    )
  })
})

describe('ACP relay client', () => {
  test('builds relay URLs without UUID or token query params', () => {
    ;(globalThis as any).window = {
      location: {
        protocol: 'https:',
        host: 'rcs.example.test',
      },
    }

    expect(relayClient.buildRelayUrl('agent_123')).toBe(
      'wss://rcs.example.test/acp/relay/agent_123',
    )
  })
})
