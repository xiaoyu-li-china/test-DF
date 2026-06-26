# Auth B808 — Token Refresh Infinite Loop Fix

## Bug Description

When the access token expires, the frontend tries to refresh it via `POST /auth/refresh`. If the refresh token is also expired or invalid, the backend returns `401 { error: "token_expired" }`. The frontend's 401 interceptor sees `token_expired` and **triggers another refresh**, creating an infinite loop:

```
GET /profile → 401 token_expired → POST /auth/refresh → 401 token_expired → POST /auth/refresh → 401 ...
```

Browser Network tab shows continuous 401 responses until the page crashes or the user closes it.

## Root Causes (3 layers)

### 1. Backend: Ambiguous error code

`/auth/refresh` returned `{ error: "token_expired" }` on refresh token failure — the same error code used for access token expiration. The frontend cannot distinguish "access token expired (try refresh)" from "refresh token expired (give up)".

**File**: `backend/src/routes/auth.js` line 57

**Fix**: Changed error code from `token_expired` to `refresh_token_expired` when the refresh token itself is expired/invalid.

### 2. Frontend client.ts: No single-flight for refresh + no failure handling

- Multiple concurrent 401s (e.g., 5 API calls firing at once) each independently trigger `refreshTokens()`, causing 5 parallel refresh requests.
- When `refreshTokens()` fails (returns null), the client doesn't clear tokens or redirect — it just falls through and the original request fails silently, prompting another attempt.

**File**: `frontend/src/api/client.ts`

**Fix**:
- **Single-flight refresh**: `singleFlightRefresh()` deduplicates concurrent refresh attempts. If a refresh is already in-flight, subsequent callers await the same Promise.
- **Force logout on refresh failure**: `doRefresh()` checks for `refresh_token_expired` / `invalid_refresh_token` errors and calls `forceLogout()` (clears localStorage + redirects to `/login`).
- **Use `res.clone().json()`** instead of consuming the response body, preventing issues with already-read streams.

### 3. AuthProvider: No refresh failure recovery

The `AuthProvider` only called `client('/profile')` on mount. If that failed (because access token expired), it silently set `user = null` without attempting a token refresh. The user would see the login page but their stale tokens would remain in localStorage, causing issues on next login.

**File**: `frontend/src/contexts/AuthProvider.tsx`

**Fix**: On `/profile` failure, attempt `singleFlightRefresh()`. If refresh succeeds, retry `/profile`. If refresh fails, clear tokens and set user to null.

## Reproduction Steps

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173`, login with `admin` / `password123`
4. Wait 15 seconds for access token to expire (configured `ACCESS_TTL = '15s'`)
5. Click "Fetch Protected Data"
6. **Before fix**: Network tab shows infinite `POST /auth/refresh` → 401 → `POST /auth/refresh` → 401 loop
7. **After fix**: One `POST /auth/refresh` call, on failure clears tokens and redirects to `/login`

To simulate refresh token expiry:
1. Login, then manually delete the refresh token from localStorage: `localStorage.removeItem('refresh_token')`
2. Wait for access token to expire (15s)
3. Click "Fetch Protected Data"
4. **Before fix**: Infinite 401 loop
5. **After fix**: Single refresh attempt fails → tokens cleared → redirect to login

## Architecture

```
backend/
  src/
    app.js                    # Express server on :3001
    routes/auth.js            # /auth/login, /auth/refresh, /auth/logout
    middleware/auth.js        # JWT access token verification
    utils/jwt.js              # Sign/verify JWT helpers

frontend/
  src/
    api/client.ts             # HTTP client with single-flight refresh
    contexts/AuthProvider.tsx  # Auth state with refresh recovery
    pages/LoginPage.tsx        # Login form
    pages/DashboardPage.tsx    # Protected page
    App.tsx                    # Router + AuthProvider wrapper
    main.tsx                   # Entry point
```

## Key Fix Summary

| Layer | Before | After |
|-------|--------|-------|
| Backend `/auth/refresh` | Returns `{ error: "token_expired" }` | Returns `{ error: "refresh_token_expired" }` |
| Frontend `client.ts` | Every 401 triggers independent refresh | Single-flight: concurrent 401s share one refresh Promise |
| Frontend `client.ts` | Refresh failure returns null, no cleanup | Refresh failure calls `forceLogout()` → clear tokens → redirect |
| AuthProvider | Silently sets `user = null` on /profile failure | Attempts refresh → retry profile → or clear tokens |
