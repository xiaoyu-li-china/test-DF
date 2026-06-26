const BASE_URL = 'http://localhost:3001';

function getStoredTokens() {
  const accessToken = localStorage.getItem('access_token');
  const refreshToken = localStorage.getItem('refresh_token');
  return { accessToken, refreshToken };
}

function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
}

function clearStoredTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

function forceLogout() {
  clearStoredTokens();
  window.location.href = '/login';
}

let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

async function doRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) {
    forceLogout();
    return null;
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (res.status === 401) {
    const body = await res.json();
    if (body.error === 'refresh_token_expired' || body.error === 'invalid_refresh_token' || body.error === 'missing_refresh_token') {
      forceLogout();
      return null;
    }
    forceLogout();
    return null;
  }

  if (!res.ok) {
    forceLogout();
    return null;
  }

  const data = await res.json();
  setStoredTokens(data.accessToken, data.refreshToken);
  return data;
}

async function singleFlightRefresh(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function client<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { accessToken } = getStoredTokens();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const body = await res.clone().json();
    if (body.error === 'token_expired') {
      const newTokens = await singleFlightRefresh();
      if (newTokens) {
        headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
        res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
      } else {
        throw new Error('Session expired');
      }
    } else if (body.error === 'refresh_token_expired' || body.error === 'invalid_refresh_token') {
      forceLogout();
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export { client, getStoredTokens, setStoredTokens, clearStoredTokens, singleFlightRefresh, forceLogout };
