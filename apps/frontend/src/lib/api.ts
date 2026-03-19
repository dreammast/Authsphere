import axios from 'axios';

// In dev: empty baseURL so Vite proxy handles /api/* → http://localhost:4000
// In prod: set VITE_API_URL=https://your-backend.com
function normalizeBaseUrl(raw: unknown): string {
  const v = String(raw ?? '').trim();
  if (!v) return '';

  // Our app code calls `/api/...` already. If env includes `/api`, strip it to
  // avoid `/api/api/...` bugs (common misconfig).
  return v.endsWith('/api') ? v.slice(0, -4) : v;
}

const BASE_URL =
  import.meta.env.DEV
    ? '' // always rely on Vite proxy in dev
    : normalizeBaseUrl(import.meta.env.VITE_API_URL);

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15000,
});

// ── Attach JWT to every request ───────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authsphere:accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor ─────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // ── Network error: server down or proxy not working ───────────────────────
    if (!error.response) {
      console.error('[api] Network error — is auth-server running on port 4000?', error.message);
      // Lazy import to avoid circular dependency
      import('../hooks/useJWT').then(({ showToast }) => {
        showToast('error', 'Server unreachable', 'Check that the auth server is running');
      }).catch(() => {});
      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // ── Token expired → attempt silent refresh ────────────────────────────────
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('authsphere:refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(
          `${BASE_URL || 'http://localhost:4000'}/api/auth/token/refresh`,
          { refreshToken }
        );
        const { accessToken } = res.data.data;
        localStorage.setItem('authsphere:accessToken', accessToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('authsphere:accessToken');
        localStorage.removeItem('authsphere:refreshToken');
        window.location.href = '/';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Generic 401 — invalid or missing token ────────────────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      localStorage.removeItem('authsphere:accessToken');
      localStorage.removeItem('authsphere:refreshToken');
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')) {
        window.location.href = '/';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
