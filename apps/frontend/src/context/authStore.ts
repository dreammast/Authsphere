import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export type AuthMethod = 'FIDO2_WEBAUTHN' | 'OTP' | 'REFRESH_TOKEN' | null;

export interface AuthUser {
  id:           string;
  email:        string;
  display_name: string;
  role:         'student' | 'faculty' | 'admin';
  student_id?:  string;
  dept?:        string;
}

function normalizeRole(role: unknown): AuthUser['role'] {
  const r = String(role ?? '').toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'faculty') return 'faculty';
  return 'student';
}

function normalizeUser(user: any): AuthUser {
  const email = String(user?.email ?? '');
  const displayName =
    String(user?.display_name ?? user?.displayName ?? user?.name ?? '').trim() ||
    email ||
    'User';

  return {
    id: String(user?.id ?? ''),
    email,
    display_name: displayName,
    role: normalizeRole(user?.role),
    student_id: user?.student_id ?? user?.studentId ?? user?.studentID,
    dept: user?.dept,
  };
}

interface AuthState {
  token:       string | null;
  user:        AuthUser | null;
  expiresAt:   number | null;
  authMethod:  AuthMethod;
  isLoading:   boolean;

  setAuth:   (token: string, user: any, expiresAt: number, method: AuthMethod) => void;
  logout:    () => Promise<void>;
  refresh:   () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:      null,
      user:       null,
      expiresAt:  null,
      authMethod: null,
      isLoading:  false,

      setAuth: (token, user, expiresAt, method) => {
        set({ token, user: normalizeUser(user), expiresAt, authMethod: method, isLoading: false });
      },

      logout: async () => {
        try {
          const { token } = get();
          if (token) await api.delete('/api/auth/session');
        } catch { /* ignore */ }
        localStorage.removeItem('authsphere:accessToken');
        localStorage.removeItem('authsphere:refreshToken');
        set({ token: null, user: null, expiresAt: null, authMethod: null });
      },

      refresh: async () => {
        try {
          const res = await api.post('/api/auth/token/refresh');
          const { token, expires_at } = res.data.data as { token: string; expires_at: number };
          set((s) => ({ ...s, token, expiresAt: expires_at }));
        } catch {
          set({ token: null, user: null, expiresAt: null, authMethod: null });
        }
      },
    }),
    {
      name:    'authsphere-auth',
      partialize: (state: AuthState) => ({ token: state.token, user: state.user, expiresAt: state.expiresAt, authMethod: state.authMethod }),
    },
  ),
);
