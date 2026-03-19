// ─── JWT Payload ───────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;           // user email
  userId: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  name: string;
  studentId?: string;
  iss: string;
  aud: string[];
  iat: number;
  exp: number;
  jti: string;
  authMethod: 'FIDO2_WEBAUTHN' | 'OTP' | 'REFRESH_TOKEN';
}

// ─── API Response Types ────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Auth Types ────────────────────────────────────────────────────────────
export interface LoginBeginResponse {
  challenge: string;
  options: unknown;
}

export interface RegisterBeginResponse {
  challenge: string;
  options: unknown;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// ─── Portal Types ──────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  studentId?: string;
  name: string;
  role: string;
}

export const PORTAL_AUDIENCE = ['lms', 'erp', 'library', 'email', 'admin'] as const;
export type PortalAudience = typeof PORTAL_AUDIENCE[number];

// ─── Validation ────────────────────────────────────────────────────────────
export const VTU_EMAIL_REGEX = /^[a-z0-9.]+@veltech\.edu\.in$/i;

export function isVelTechEmail(email: string): boolean {
  return VTU_EMAIL_REGEX.test(email);
}
