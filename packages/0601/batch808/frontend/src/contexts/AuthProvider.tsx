import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { client, getStoredTokens, setStoredTokens, clearStoredTokens, singleFlightRefresh } from '../api/client';

interface User {
  id: number;
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { accessToken, refreshToken } = getStoredTokens();
    if (accessToken && refreshToken) {
      client<User>('/profile')
        .then(setUser)
        .catch(async () => {
          try {
            const newTokens = await singleFlightRefresh();
            if (newTokens) {
              const profile = await client<User>('/profile');
              setUser(profile);
            } else {
              clearStoredTokens();
              setUser(null);
            }
          } catch {
            clearStoredTokens();
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else if (refreshToken) {
      singleFlightRefresh()
        .then(async (newTokens) => {
          if (newTokens) {
            const profile = await client<User>('/profile');
            setUser(profile);
          } else {
            clearStoredTokens();
            setUser(null);
          }
        })
        .catch(() => {
          clearStoredTokens();
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      clearStoredTokens();
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    const data = await res.json();
    setStoredTokens(data.accessToken, data.refreshToken);

    const profile = await client<User>('/profile');
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    clearStoredTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
