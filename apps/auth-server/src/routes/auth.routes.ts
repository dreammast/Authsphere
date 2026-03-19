import { Router } from 'express';
import speakeasy from 'speakeasy';
import { 
  generateRegistrationOptions, 
  verifyRegistrationResponse, 
  generateAuthenticationOptions, 
  verifyAuthenticationResponse 
} from '@simplewebauthn/server';
import type { AuthenticatorTransport } from '@simplewebauthn/types';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

import { prisma } from '../lib/prisma';
import { redisGet, redisSet, redisDel, storeChallenge, getChallenge, deleteChallenge } from '../lib/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getJWKS } from '../lib/jwt';
import { sendOTPEmail } from '../lib/mailer';
import { logAuditEvent } from '../lib/audit';
import { logger } from '../lib/logger';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = process.env.RP_NAME || 'AuthSphere VelTech';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:5173';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.map((v) => String(v ?? '').trim()).filter(Boolean)));
}

function getExpectedOrigins(reqOrigin?: string): string | string[] {
  // Prefer the request Origin if it is explicitly allowed (best dev UX when Vite switches ports)
  const preferred = reqOrigin && ALLOWED_ORIGINS.includes(reqOrigin) ? [reqOrigin] : [];

  const origins = uniqueStrings([
    ...preferred,
    RP_ORIGIN,
    process.env.ORIGIN, // backwards-compat
    ...ALLOWED_ORIGINS,
  ]);

  return origins.length === 1 ? origins[0] : origins;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (local.length <= 3) return email;
  const masked = local.substring(0, 3) + '****';
  return `${masked}@${domain}`;
}

// ── FIDO2 LOGIN BEGIN ────────────────────────────────────────────────────────
router.post('/login/begin', authRateLimiter, async (req, res) => {
  console.log('[FIDO2/login/begin] Request received:', req.body);
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() },
      include: { credentials: { where: { isRevoked: false } } }
    });

    if (!user) {
      console.log(`[FIDO2/login/begin] User not found: ${email}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.credentials.length === 0) {
      console.log(`[FIDO2/login/begin] No FIDO2 credentials for ${email}. Triggering OTP...`);
      // No FIDO2 — instruct frontend to go to OTP path
      return res.json({ success: true, data: { requireOTP: true, userId: user.id } });
    }

    const options = await generateAuthenticationOptions({
      rpID:             RP_ID,
      userVerification: 'preferred', // ALLOWS PIN FALLBACK
      timeout:          60000,
      allowCredentials: user.credentials.map(c => ({
        id:         isoBase64URL.toBuffer(c.credentialId),
        type:       'public-key',
        transports: (c.transports as AuthenticatorTransport[]) || ['internal'],
      })),
    });

    await storeChallenge(user.id, options.challenge, 'login');
    console.log(`[FIDO2/login/begin] Options generated for ${email}`);
    res.json({ success: true, data: { options, userId: user.id } });
  } catch (err) {
    console.error('[FIDO2/login/begin] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to initiate biometric login' });
  }
});

// ── FIDO2 LOGIN COMPLETE ─────────────────────────────────────────────────────
router.post('/login/complete', authRateLimiter, async (req, res) => {
  console.log('[FIDO2/login/complete] Request received');
  try {
    const { userId, response } = req.body;
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { credentials: { where: { credentialId: response.id, isRevoked: false } } }
    });

    if (!user || user.credentials.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid user or credential' });
    }

    const credential = user.credentials[0];
    const challenge = await getChallenge(userId, 'login');
    if (!challenge) return res.status(400).json({ success: false, error: 'Challenge expired' });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin:    getExpectedOrigins(req.headers.origin as string | undefined),
      expectedRPID:      RP_ID,
      authenticator: {
        credentialID:         isoBase64URL.toBuffer(credential.credentialId),
        credentialPublicKey:  isoBase64URL.toBuffer(credential.publicKey),
        counter:              Number(credential.counter),
        transports:           (credential.transports as AuthenticatorTransport[]) || [],
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      console.log('[FIDO2/login/complete] Verification FAILED');
      return res.status(401).json({ success: false, error: 'Biometric verification failed' });
    }

    // Update counter
    await prisma.fidoCredential.update({
      where: { id: credential.id },
      data: { 
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date()
      }
    });

    await deleteChallenge(userId, 'login');

    // Issue tokens
    const accessToken = signAccessToken({
      sub: user.email,
      userId: user.id,
      role: user.role,
      name: user.name,
      authMethod: 'FIDO2_WEBAUTHN',
    });
    const refreshToken = signRefreshToken(user.id);

    await logAuditEvent({ userId, action: 'FIDO2_LOGIN_SUCCESS', status: 'SUCCESS', ipAddress: req.ip });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      }
    });
  } catch (err) {
    console.error('[FIDO2/login/complete] Error:', err);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

// ── FIDO2 REGISTER BEGIN ─────────────────────────────────────────────────────
router.post('/register/begin', authRateLimiter, async (req, res) => {
  console.log('[FIDO2/register/begin] Request received:', req.body);
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const domain = process.env.CAMPUS_DOMAIN || 'veltech.edu.in';
    // Domain restriction relaxed for testing
    // if (!email.toLowerCase().endsWith(`@${domain}`)) {
    //   return res.status(400).json({ success: false, error: `Only @${domain} emails permitted` });
    // }

    let user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() },
      include: { credentials: { where: { isRevoked: false } } }
    });

    if (!user) {
      console.log(`[FIDO2/register/begin] Creating new user: ${email}`);
      user = await prisma.user.create({
        data: { 
          email: email.toLowerCase(), 
          name: name || email.split('@')[0],
          role: 'STUDENT'
        },
        include: { credentials: true }
      });
    }

    const options = await generateRegistrationOptions({
      rpName:           RP_NAME,
      rpID:             RP_ID,
      userID:           user.id,
      userName:         user.email,
      userDisplayName:  user.name || user.email,
      attestationType:  'none',
      excludeCredentials: user.credentials.map(c => ({
        id: isoBase64URL.toBuffer(c.credentialId),
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey:             'preferred',
        userVerification:        'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    await storeChallenge(user.id, options.challenge, 'register');
    console.log(`[FIDO2/register/begin] Registration options generated for ${email}`);
    res.json({ success: true, data: { options } });
  } catch (err) {
    console.error('[FIDO2/register/begin] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to initiate registration' });
  }
});

// ── FIDO2 REGISTER COMPLETE ──────────────────────────────────────────────────
router.post('/register/complete', authRateLimiter, async (req, res) => {
  console.log('[FIDO2/register/complete] Request received');
  try {
    const { email, response } = req.body;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user) return res.status(400).json({ success: false, error: 'User not found' });

    const challenge = await getChallenge(user.id, 'register');
    if (!challenge) return res.status(400).json({ success: false, error: 'Registration challenge expired' });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin:    getExpectedOrigins(req.headers.origin as string | undefined),
      expectedRPID:      RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      console.log('[FIDO2/register/complete] Verification FAILED');
      return res.status(400).json({ success: false, error: 'Registration verification failed' });
    }

    const regInfo = verification.registrationInfo as any;
    const credId = regInfo.credentialID || regInfo.credential?.id;
    const pubKey = regInfo.credentialPublicKey || regInfo.credential?.publicKey;
    const counter = regInfo.counter ?? regInfo.credential?.counter ?? 0;

    if (!credId || !pubKey) {
      return res.status(400).json({ success: false, error: 'Registration payload invalid' });
    }

    const credIdStr = isoBase64URL.fromBuffer(credId);

    // Check if credential already exists
    const existing = await prisma.fidoCredential.findUnique({
      where: { credentialId: credIdStr }
    });

    if (existing) {
      return res.status(400).json({ success: false, error: 'This device is already registered' });
    }

    await prisma.fidoCredential.create({
      data: {
        userId:       user.id,
        credentialId: credIdStr,
        publicKey:    isoBase64URL.fromBuffer(pubKey),
        counter:      BigInt(counter),
        transports:   (response.response.transports as string[]) || ['internal'],
      }
    });

    await deleteChallenge(user.id, 'register');
    await logAuditEvent({ userId: user.id, action: 'FIDO2_REGISTER_SUCCESS', status: 'SUCCESS', ipAddress: req.ip });

    console.log(`[FIDO2/register/complete] Device registered for ${email}`);
    res.json({ success: true, message: 'Device registered successfully' });
  } catch (err) {
    console.error('[FIDO2/register/complete] Error:', err);
    res.status(500).json({ success: false, error: 'Registration completion failed' });
  }
});

// ── OTP SEND ─────────────────────────────────────────────────────────────────
router.post('/otp/send', otpRateLimiter, async (req, res) => {
  console.log('[OTP/send] Request received:', req.body);
  try {
    const { email } = req.body as { email: string };

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const domain = process.env.CAMPUS_DOMAIN ?? 'veltech.edu.in';
    const cleanEmail = email.trim().toLowerCase();

    // Domain restriction relaxed for testing
    // if (!cleanEmail.endsWith(`@${domain}`)) {
    //   return res.status(400).json({ success: false, error: `Only @${domain} emails permitted` });
    // }

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user) {
      console.log(`[OTP/send] User not found: ${cleanEmail}`);
      // Generic success to prevent enumeration
      return res.json({ success: true, message: 'If this account exists, an OTP has been sent' });
    }

    // Check lockout
    const lockoutKey = `otp_lockout:${user.id}`;
    const locked = await redisGet(lockoutKey);
    if (locked) {
      return res.status(429).json({ success: false, error: 'Too many attempts. Try again in 30 minutes.' });
    }

    // Generate OTP
    const secret = speakeasy.generateSecret({ length: 20 });
    const otp = speakeasy.totp({
      secret:   secret.base32,
      encoding: 'base32',
      step:     180, // 3 mins
      digits:   6,
    });

    console.log(`[OTP/send] Generated OTP for ${cleanEmail}: ${otp}`);

    // Store secret in Redis FIRST before delivery
    await redisSet(`otp_secret:${user.id}`, secret.base32, 300);
    console.log(`[OTP/send] Secret stored in Redis for user ${user.id}`);

    // Deliver via email
    await sendOTPEmail(user.email, otp, user.name);

    await logAuditEvent({ userId: user.id, action: 'OTP_SENT', status: 'SUCCESS', ipAddress: req.ip });

    res.json({
      success:     true,
      message:     'OTP sent to your email',
      maskedEmail: maskEmail(user.email),
      expiresIn:   180,
    });
  } catch (err) {
    console.error('[OTP/send] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// ── OTP VERIFY ───────────────────────────────────────────────────────────────
router.post('/otp/verify', authRateLimiter, async (req, res) => {
  console.log('[OTP/verify] Request received:', { email: req.body.email });
  try {
    const { email, otp } = req.body as { email: string; otp: string };

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP are required' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

    const secretB32 = await redisGet(`otp_secret:${user.id}`);
    console.log(`[OTP/verify] Secret found in Redis: ${!!secretB32}`);

    if (!secretB32) {
      return res.status(400).json({ success: false, error: 'OTP has expired or was never sent' });
    }

    const valid = speakeasy.totp.verify({
      secret:   secretB32,
      encoding: 'base32',
      token:    otp.trim(),
      step:     180,
      window:   1, // clock drift
      digits:   6,
    });

    console.log(`[OTP/verify] OTP valid: ${valid}`);

    if (!valid) {
      const attemptsKey = `otp_attempts:${user.id}`;
      const attempts = parseInt((await redisGet(attemptsKey)) ?? '0') + 1;
      await redisSet(attemptsKey, String(attempts), 1800);

      if (attempts >= 5) {
        await redisSet(`otp_lockout:${user.id}`, '1', 1800);
        await redisDel(`otp_secret:${user.id}`);
        return res.status(429).json({ success: false, error: 'Too many attempts. Locked for 30m.' });
      }

      return res.status(401).json({ 
        success: false, 
        error: `Invalid OTP. ${5 - attempts} attempts remaining.`,
        attemptsRemaining: 5 - attempts
      });
    }

    // Success
    await redisDel(`otp_secret:${user.id}`);
    await redisDel(`otp_attempts:${user.id}`);

    const credCount = await prisma.fidoCredential.count({
      where: { userId: user.id, isRevoked: false }
    });

    const accessToken = signAccessToken({
      sub: user.email,
      userId: user.id,
      role: user.role,
      name: user.name,
      authMethod: 'OTP',
    });
    const refreshToken = signRefreshToken(user.id);

    await logAuditEvent({ userId: user.id, action: 'OTP_LOGIN_SUCCESS', status: 'SUCCESS', ipAddress: req.ip });

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        hasCredentials: credCount > 0
      }
    });
  } catch (err) {
    console.error('[OTP/verify] Error:', err);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ── MISC ─────────────────────────────────────────────────────────────────────
router.post('/token/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid user' });

    const accessToken = signAccessToken({
      sub: user.email,
      userId: user.id,
      role: user.role,
      name: user.name,
      authMethod: 'REFRESH_TOKEN',
    });

    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Refresh failed' });
  }
});

router.get('/jwks.json', (req, res) => res.json(getJWKS()));
router.get('/me', authenticate, async (req: any, res) => {
  res.json({ success: true, data: req.user });
});

export { router as authRouter };
