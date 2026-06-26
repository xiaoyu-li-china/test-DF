export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthConfig {
  onRefresh: (refreshToken: string) => Promise<AuthTokens>
  onTokenUpdate?: (tokens: AuthTokens) => void
}

export type FetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 401 }
  | { ok: false; status: number; error?: string }

class AuthService {
  private config: AuthConfig
  private tokens: AuthTokens | null = null
  private refreshPromise: Promise<AuthTokens> | null = null
  private isRefreshing = false

  constructor(config: AuthConfig) {
    this.config = config
  }

  setTokens(tokens: AuthTokens | null) {
    this.tokens = tokens
  }

  getTokens(): AuthTokens | null {
    return this.tokens
  }

  isRefreshingToken(): boolean {
    return this.isRefreshing
  }

  private async refreshToken(): Promise<AuthTokens> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }

    this.isRefreshing = true
    this.refreshPromise = this.config.onRefresh(this.tokens.refreshToken)
      .then((newTokens) => {
        this.tokens = newTokens
        this.config.onTokenUpdate?.(newTokens)
        return newTokens
      })
      .finally(() => {
        this.isRefreshing = false
        this.refreshPromise = null
      })

    return this.refreshPromise
  }

  async request<T>(
    fetchFn: (accessToken: string) => Promise<FetchResult<T>>
  ): Promise<FetchResult<T>> {
    if (!this.tokens) {
      return { ok: false, status: 401 }
    }

    let result = await fetchFn(this.tokens.accessToken)

    if (result.ok === false && result.status === 401) {
      try {
        const newTokens = await this.refreshToken()
        result = await fetchFn(newTokens.accessToken)
      } catch {
        return { ok: false, status: 401 }
      }
    }

    return result
  }

  reset() {
    this.tokens = null
    this.refreshPromise = null
    this.isRefreshing = false
  }
}

export { AuthService }
