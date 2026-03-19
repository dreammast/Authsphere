import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { JwtPayload } from '@authsphere/shared';

const PRIVATE_KEY_PATH = process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem';
const PUBLIC_KEY_PATH = process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem';

function loadKey(keyPath: string): string {
  const resolvedPath = path.resolve(process.cwd(), keyPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Key file not found: ${resolvedPath}. Run: npm run generate-keys`);
  }
  return fs.readFileSync(resolvedPath, 'utf8');
}

export function getPrivateKey(): string { return loadKey(PRIVATE_KEY_PATH); }
export function getPublicKey(): string { return loadKey(PUBLIC_KEY_PATH); }

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti' | 'iss' | 'aud'>): string {
  const jti = uuidv4();
  return jwt.sign(
    { ...payload, jti },
    getPrivateKey(),
    {
      algorithm: 'RS256',
      expiresIn: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1800'),
      issuer: process.env.JWT_ISSUER || 'authsphere.veltech.edu.in',
      audience: ['lms', 'erp', 'library', 'email', 'admin'],
    }
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getPublicKey(), {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER || 'authsphere.veltech.edu.in',
  }) as JwtPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, jti: uuidv4(), type: 'refresh' },
    getPrivateKey(),
    {
      algorithm: 'RS256',
      expiresIn: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '604800'),
      issuer: process.env.JWT_ISSUER || 'authsphere.veltech.edu.in',
    }
  );
}

export function verifyRefreshToken(token: string): { userId: string; jti: string } {
  return jwt.verify(token, getPublicKey(), {
    algorithms: ['RS256'],
    issuer: process.env.JWT_ISSUER || 'authsphere.veltech.edu.in',
  }) as { userId: string; jti: string };
}

// JWKS endpoint public key in JWK format
export function getJWKS() {
  return {
    keys: [{
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid: 'authsphere-key-1',
      // In production, parse the actual RSA public key into JWK components
      // For simplicity, clients can use the /auth/jwks.json endpoint
    }],
    publicKeyPem: getPublicKey(),
  };
}
