import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  studentId?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  authMethod: 'FIDO2_WEBAUTHN' | 'OTP' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (tokens: { accessToken: string; refreshToken: string; expiresIn: number }, user: User, authMethod: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: localStorage.getItem('authsphere:accessToken'),
    authMethod: localStorage.getItem('authsphere:authMethod') as any,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('authsphere:accessToken');
    if (!token) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    api.get('/api/auth/me')
      .then((res) => {
        setState(s => ({
          ...s,
          user: res.data.data,
          isAuthenticated: true,
          isLoading: false,
          authMethod: localStorage.getItem('authsphere:authMethod') as any,
        }));
      })
      .catch(() => {
        localStorage.removeItem('authsphere:accessToken');
        localStorage.removeItem('authsphere:refreshToken');
        setState(s => ({ ...s, isLoading: false }));
      });
  }, []);

  const login = useCallback((tokens: any, user: User, authMethod: string) => {
    localStorage.setItem('authsphere:accessToken', tokens.accessToken);
    localStorage.setItem('authsphere:refreshToken', tokens.refreshToken);
    localStorage.setItem('authsphere:authMethod', authMethod);
    setState({ user, accessToken: tokens.accessToken, authMethod: authMethod as any, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.delete('/api/auth/session');
    } catch {}
    localStorage.removeItem('authsphere:accessToken');
    localStorage.removeItem('authsphere:refreshToken');
    localStorage.removeItem('authsphere:authMethod');
    setState({ user: null, accessToken: null, authMethod: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await api.get('/api/auth/me');
    setState(s => ({ ...s, user: res.data.data }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
