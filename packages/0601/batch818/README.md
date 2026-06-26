# B818: Auth Refresh Infinite Loop Fix

Full-stack project demonstrating the fix for the infinite `/auth/refresh` loop bug when access tokens expire.

## Problem

When the access token expires, multiple concurrent API requests trigger parallel `/auth/refresh` calls, causing:
1. Race conditions where multiple refresh requests are made simultaneously
2. If the refresh token is invalid/expired, the 401 response triggers another refresh attempt, creating an infinite loop
3. Network tab shows continuous 401 responses from `/auth/refresh`

## Architecture

```
├── backend/          # FastAPI backend
│   ├── main.py       # API endpoints including /auth/refresh
│   ├── auth.py       # Auth logic with refresh token handling
│   ├── database.py   # SQLAlchemy models and DB setup
│   └── schemas.py    # Pydantic models
└── frontend/         # React frontend
    └── src/
        ├── api/client.ts    # Axios client with single-flight refresh
        ├── context/AuthProvider.tsx  # Auth state management
        └── pages/           # Login and Home pages
```

## Key Fixes

### 1. Backend: `/auth/refresh` returns proper 401

**File:** [backend/auth.py](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch818/backend/auth.py#L82-L109)

The `refresh_access_token` function returns HTTP 401 when:
- Refresh token is not found in the database
- Refresh token has expired
- Also clears the invalid token from the database

### 2. Frontend: Single-flight refresh pattern

**File:** [frontend/src/api/client.ts](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch818/frontend/src/api/client.ts#L16-L155)

Key mechanisms:
- `refreshPromise` shared promise prevents parallel refresh calls
- All pending requests wait for the same refresh promise
- Once refresh completes, queued requests are retried with the new token
- If refresh fails (401), **all pending requests are rejected** and tokens are cleared
- Refresh endpoint itself is excluded from the interceptor to prevent infinite recursion

### 3. Frontend: Clear tokens and redirect on refresh failure

**File:** [frontend/src/api/client.ts](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch818/frontend/src/api/client.ts#L127-L130)

When refresh fails:
- Clear both access and refresh tokens from localStorage
- Dispatch `AUTH_REFRESH_EVENT` custom event
- AuthProvider listens for this event and redirects to login

### 4. AuthProvider: Handle refresh failure globally

**File:** [frontend/src/context/AuthProvider.tsx](file:///Users/lxy/Documents/wkspsTreacn/test-DF/packages/0601/batch818/frontend/src/context/AuthProvider.tsx#L49-L59)

- Listens for the `AUTH_REFRESH_EVENT` from the API client
- Clears user state and redirects to `/login` when refresh fails

## Reproduction Steps

### Prerequisites
- Python 3.10+
- Node.js 18+

### Step 1: Start Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python main.py
```

Backend runs at `http://localhost:8000`

### Step 2: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### Step 3: Reproduce the Original Bug (Before Fix)

To understand what the bug looked like:

1. Open `http://localhost:5173` in your browser
2. Open DevTools (F12) → Network tab
3. Login with: `admin` / `admin123`
4. On the Home page, click "Refresh" multiple times quickly to trigger parallel requests
5. Wait 60 seconds for the access token to expire (token TTL is 1 minute for testing)
6. Click "Refresh" multiple times again

**Before the fix, you would see:**
- Multiple concurrent `POST /auth/refresh` requests (one per original request)
- If refresh token was invalid, infinite 401 responses loop
- Browser hangs or becomes unresponsive

**After the fix, you will see:**
- Only ONE `POST /auth/refresh` request regardless of how many parallel API calls are made
- Other requests wait for the refresh to complete, then retry with the new token
- If refresh token is invalid: tokens are cleared, user is redirected to `/login`

### Step 4: Test Refresh Token Failure (Simulating Expired Refresh Token)

1. Login and wait for the access token to expire (60 seconds)
2. Before clicking refresh, manually invalidate the refresh token:
   - Option A: Delete the `test.db` file in the backend directory
   - Option B: Use SQLite browser to clear the `refresh_token` field for the admin user
   - Option C: Wait 7 days for the refresh token to expire (not recommended)
3. Click "Refresh" on the Home page

**Expected behavior after fix:**
1. API request returns 401
2. ONE `/auth/refresh` call is made, which also returns 401
3. Tokens are cleared from localStorage
4. User is automatically redirected to `/login`
5. **No infinite loop!** Only one refresh attempt is made

### Step 5: Test Multiple Parallel Requests

1. Login to the app
2. Create 2-3 resources
3. Wait 60 seconds for access token to expire
4. Open DevTools Network tab
5. Click "Refresh" button 5 times rapidly

**Expected behavior after fix:**
- You'll see 5 requests to `/api/protected-resources` return 401
- Only **ONE** request to `/auth/refresh` is made
- After refresh succeeds, all 5 pending requests are retried automatically with the new token
- All 5 requests complete successfully with 200

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login with username/password | No |
| POST | `/auth/refresh` | Refresh access token using refresh token | No |
| POST | `/auth/logout` | Logout and invalidate refresh token | Yes |
| GET | `/auth/me` | Get current user info | Yes |
| GET | `/api/protected-resources` | List user's resources | Yes |
| POST | `/api/protected-resources` | Create new resource | Yes |

## Token Configuration

| Token Type | Expiry | Purpose |
|------------|--------|---------|
| Access Token | 1 minute | Short-lived, used for API authentication |
| Refresh Token | 7 days | Long-lived, used to get new access tokens |

The access token TTL is intentionally short (1 minute) for testing purposes. In production, use 15-60 minutes.

## Default Credentials

- Username: `admin`
- Password: `admin123`

## Project Structure

```
batch818/
├── backend/
│   ├── __pycache__/
│   ├── .gitignore
│   ├── requirements.txt
│   ├── main.py              # FastAPI app with auth endpoints
│   ├── auth.py              # Auth logic with refresh_access_token()
│   ├── database.py          # SQLAlchemy models, User has refresh_token field
│   └── schemas.py           # Pydantic request/response models
├── frontend/
│   ├── node_modules/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts    # Axios client with single-flight refresh
│   │   ├── context/
│   │   │   └── AuthProvider.tsx  # Auth context, listens for refresh failures
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   └── Home.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

## How the Shared Refresh Promise Pattern Works

```
Multiple parallel requests with expired token:
    │
    ├─ Request 1 → 401 → Check refreshPromise (null) → create refreshPromise
    ├─ Request 2 → 401 → Check refreshPromise (exists) → await refreshPromise
    ├─ Request 3 → 401 → Check refreshPromise (exists) → await refreshPromise
    │
    └─ refreshPromise in progress...
       │
       ├─ ✅ Success: resolves with new access_token
       │    ├─ Request 1: already retried by first interceptor
       │    ├─ Request 2: .then() → retry with new token
       │    └─ Request 3: .then() → retry with new token
       │
       └─ ❌ Failure: rejects with error
            ├─ Request 1: returns rejected Promise
            ├─ Request 2: .catch() → propagate error
            └─ Request 3: .catch() → propagate error
            └─ All: clearTokens() + dispatch AUTH_REFRESH_EVENT → redirect to login
```

**Advantages over manual queue:**
- Leverages Promise's native ability to have multiple `.then()` handlers
- No need to manually manage `resolve`/`reject` callbacks
- Cleaner, more idiomatic async code
- `refreshPromise` is automatically reset in `finally` block

This ensures:
1. **Exactly ONE refresh request** is made, regardless of how many concurrent 401s occur
2. **No infinite loops** because refresh endpoint is excluded from the interceptor
3. **Atomic failure handling** - all pending requests fail together and user is redirected to login
4. **Automatic retry** - each waiting request retries itself after refresh succeeds
