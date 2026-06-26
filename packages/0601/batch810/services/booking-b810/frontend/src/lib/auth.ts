type Tokens = {
  accessToken: string;
  refreshToken: string;
};

type RefreshPromise = {
  resolve: (token: string) => void;
  reject: (err: Error) => void;
};

let tokens: Tokens | null = null;
let refreshPromise: Promise<string> | null = null;

export function setTokens(newTokens: Tokens | null) {
  tokens = newTokens;
  refreshPromise = null;
}

export function getAccessToken(): string | null {
  return tokens?.accessToken ?? null;
}

export async function refreshToken(): Promise<string> {
  if (!tokens) {
    throw new Error('No tokens available');
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens!.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      tokens = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? tokens!.refreshToken,
      };
      return tokens.accessToken;
    } catch (err) {
      tokens = null;
      throw err;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (!tokens) {
    throw new Error('Not authenticated');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${tokens.accessToken}`);

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const newToken = await refreshToken();
    const retryHeaders = new Headers(options.headers);
    retryHeaders.set('Authorization', `Bearer ${newToken}`);
    response = await fetch(url, { ...options, headers: retryHeaders });
  }

  return response;
}
