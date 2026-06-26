import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setTokens, authFetch, refreshToken } from '../lib/auth';

function mockFetch(responses: { url: string; status: number; body: any }[]) {
  const callMap = new Map<string, any[]>();
  responses.forEach((r) => {
    if (!callMap.has(r.url)) callMap.set(r.url, []);
    callMap.get(r.url)!.push(r);
  });

  return vi.fn(async (url: string, options: RequestInit = {}) => {
    const urlKey = url.toString();
    const queue = callMap.get(urlKey);

    if (urlKey === '/api/auth/refresh') {
      const body = JSON.parse(options.body as string);
      if (body.refreshToken === 'invalid-refresh') {
        return new Response(JSON.stringify({ error: 'Invalid refresh token' }), { status: 401 });
      }
      return new Response(
        JSON.stringify({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (queue && queue.length > 0) {
      const entry = queue.shift()!;
      return new Response(JSON.stringify(entry.body), {
        status: entry.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  });
}

describe('authFetch - 401 refresh', () => {
  beforeEach(() => {
    setTokens({
      accessToken: 'old-access-token',
      refreshToken: 'valid-refresh',
    });
  });

  it('should retry with new token after 401 and refresh succeeds', async () => {
    const fetchMock = mockFetch([
      { url: '/api/data', status: 401, body: { error: 'Unauthorized' } },
      { url: '/api/data', status: 200, body: { data: 'success' } },
    ]);

    vi.stubGlobal('fetch', fetchMock);

    const response = await authFetch('/api/data');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBe('success');

    const refreshCalls = fetchMock.mock.calls.filter(
      (call: any[]) => call[0] === '/api/auth/refresh'
    );
    expect(refreshCalls.length).toBe(1);

    const dataCalls = fetchMock.mock.calls.filter(
      (call: any[]) => call[0] === '/api/data'
    );
    expect(dataCalls.length).toBe(2);

    const retryCall = dataCalls[1];
    const retryHeaders = retryCall[1].headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-access-token');
  });

  it('should throw when refresh fails', async () => {
    setTokens({
      accessToken: 'old-access-token',
      refreshToken: 'invalid-refresh',
    });

    const fetchMock = mockFetch([
      { url: '/api/data', status: 401, body: { error: 'Unauthorized' } },
    ]);

    vi.stubGlobal('fetch', fetchMock);

    await expect(authFetch('/api/data')).rejects.toThrow('Refresh failed');
  });

  it('should only call refresh once for 3 concurrent 401 requests', async () => {
    let resolveRefresh: (value: any) => void;
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });

    let refreshCallCount = 0;

    const fetchMock = vi.fn(async (url: string, options: RequestInit = {}) => {
      if (url === '/api/auth/refresh') {
        refreshCallCount++;
        await refreshPromise;
        return new Response(
          JSON.stringify({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const authHeader = options.headers instanceof Headers
        ? options.headers.get('Authorization')
        : null;

      if (authHeader === 'Bearer old-access-token') {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      return new Response(
        JSON.stringify({ data: 'success' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    setTokens({
      accessToken: 'old-access-token',
      refreshToken: 'valid-refresh',
    });

    const [r1, r2, r3] = await Promise.all([
      authFetch('/api/data/1'),
      authFetch('/api/data/2'),
      authFetch('/api/data/3'),
    ]);

    resolveRefresh!(undefined);

    await Promise.all([r1.json(), r2.json(), r3.json()]);

    expect(refreshCallCount).toBe(1);
  });
});
