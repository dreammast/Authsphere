import Redis from 'ioredis';
import { logger } from './logger';

const useMemoryFallback = process.env.REDIS_URL === 'memory';

type SimpleStore = Map<string, { value: string; expiresAt: number | null }>;

class InMemoryRedis {
  private store: SimpleStore = new Map();

  on(_event: string, _handler: (arg: unknown) => void) {
    // no-op for compatibility
    return this;
  }

  async setex(key: string, ttlSeconds: number, value: string) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string) {
    this.store.delete(key);
  }

  async incr(key: string) {
    const current = await this.get(key);
    const next = (current ? parseInt(current, 10) || 0 : 0) + 1;
    this.store.set(key, { value: String(next), expiresAt: null });
    return next;
  }

  async expire(key: string, ttlSeconds: number) {
    const entry = this.store.get(key);
    if (!entry) return;
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, entry);
  }

  async exists(key: string) {
    const v = await this.get(key);
    return v ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const results: string[] = [];
    // simplified glob support for "*"
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      if (regex.test(key)) results.push(key);
    }
    return results;
  }
}

const redis = useMemoryFallback
  ? new InMemoryRedis()
  : new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: false,
    });

if (!useMemoryFallback) {
  (redis as any).on('connect', () => logger.info('✅ Redis connected'));
  (redis as any).on('error', (err: unknown) => logger.error('Redis error:', err));
} else {
  logger.warn('⚠️ Using in-memory Redis fallback (no persistence, dev only)');
}

export { redis };

export async function redisGet(key: string): Promise<string | null> {
  return redis.get(key);
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (ttlSeconds) {
    await (redis as any).setex(key, ttlSeconds, value);
  } else {
    await (redis as any).set(key, value);
  }
}

export async function redisDel(key: string): Promise<void> {
  await redis.del(key);
}

// ── Redis helpers ────────────────────────────────────────────────────────────

// Store FIDO2 challenge (TTL: 5 min)
export async function storeChallenge(userId: string, challenge: string, type: 'register' | 'login') {
  await redis.setex(`fido2:challenge:${type}:${userId}`, 300, challenge);
}

export async function getChallenge(userId: string, type: 'register' | 'login') {
  return redis.get(`fido2:challenge:${type}:${userId}`);
}

export async function deleteChallenge(userId: string, type: 'register' | 'login') {
  await redis.del(`fido2:challenge:${type}:${userId}`);
}

// Dev-only WebAuthn credential store (TTL: 30 days)
type DevWebAuthnCredential = {
  credentialId: string;
  publicKey: string; // base64url
  counter: number;
  transports?: string[];
  deviceType?: string | null;
  backedUp?: boolean | null;
  aaguid?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
};

export async function storeDevWebAuthnCredential(userId: string, cred: DevWebAuthnCredential) {
  await redis.setex(`dev:fido2:cred:${userId}:${cred.credentialId}`, 60 * 60 * 24 * 30, JSON.stringify(cred));
}

export async function getDevWebAuthnCredential(userId: string, credentialId: string): Promise<DevWebAuthnCredential | null> {
  const raw = await redis.get(`dev:fido2:cred:${userId}:${credentialId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DevWebAuthnCredential;
  } catch {
    return null;
  }
}

export async function getAnyDevWebAuthnCredential(userId: string): Promise<DevWebAuthnCredential | null> {
  // In-memory fallback has no SCAN; for dev we store a pointer key too.
  const pointer = await redis.get(`dev:fido2:credptr:${userId}`);
  if (!pointer) return null;
  return getDevWebAuthnCredential(userId, pointer);
}

export async function setAnyDevWebAuthnCredentialPointer(userId: string, credentialId: string) {
  await redis.setex(`dev:fido2:credptr:${userId}`, 60 * 60 * 24 * 30, credentialId);
}

// JWT blacklist (revoked tokens)
export async function blacklistToken(jti: string, expirySeconds: number) {
  await redis.setex(`jwt:blacklist:${jti}`, expirySeconds, '1');
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  return (await redis.exists(`jwt:blacklist:${jti}`)) === 1;
}

// OTP store (TTL: 5 min)
export async function storeOTP(userId: string, otpHash: string) {
  await redis.setex(`otp:${userId}`, 300, otpHash);
}

export async function getOTP(userId: string) {
  return redis.get(`otp:${userId}`);
}

export async function deleteOTP(userId: string) {
  await redis.del(`otp:${userId}`);
}

// Failed auth attempts counter (TTL: 15 min)
export async function incrementFailedAttempts(identifier: string): Promise<number> {
  const key = `auth:failures:${identifier}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 900);
  return count;
}

export async function getFailedAttempts(identifier: string): Promise<number> {
  return parseInt((await redis.get(`auth:failures:${identifier}`)) || '0');
}

export async function resetFailedAttempts(identifier: string) {
  await redis.del(`auth:failures:${identifier}`);
}
