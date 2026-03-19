import { Request, Response } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
// Inline types to avoid missing @simplewebauthn/types dependency
type RegistrationResponseJSON = any;
type AuthenticationResponseJSON = any;
import { prisma } from '../lib/prisma';
import {
  storeChallenge, getChallenge, deleteChallenge,
  storeOTP, getOTP, deleteOTP,
  incrementFailedAttempts, getFailedAttempts, resetFailedAttempts,
  blacklistToken,
  storeDevWebAuthnCredential,
  getDevWebAuthnCredential,
  getAnyDevWebAuthnCredential,
  setAnyDevWebAuthnCredentialPointer,
} from '../lib/redis';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getJWKS } from '../lib/jwt';
import { generateOTP, hashOTP, verifyOTP, sendOTPPush } from '../lib/otp';
import { logAuditEvent } from '../lib/audit';
import { logger } from '../lib/logger';
import crypto from 'crypto';
// AuthMethod enum matching Prisma schema
const AuthMethodEnum = { FIDO2_WEBAUTHN: 'FIDO2_WEBAUTHN', OTP: 'OTP', REFRESH_TOKEN: 'REFRESH_TOKEN' } as const;
type AuthMethodType = (typeof AuthMethodEnum)[keyof typeof AuthMethodEnum];

const RP_ID = process.env.RP_ID || 'localhost';
const RP_NAME = process.env.RP_NAME || 'AuthSphere VelTech';
const RP_ORIGIN = process.env.RP_ORIGIN || 'http://localhost:5173';
const MAX_FAILED = 5;

const NO_DB_MODE = process.env.AUTH_NO_DB === 'true' || process.env.AUTH_NO_DB === '1';

function devUserIdForEmail(email: string) {
  const hash = crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 24);
  return `dev_${hash}`;
}

async function issueTokenPair(user: any, authMethod: any, req: Request) {
  const accessToken = signAccessToken({
    sub: user.email,
    userId: user.id,
    role: user.role,
    name: user.name,
    studentId: user.studentId || undefined,
    authMethod,
  });
  const refreshToken = signRefreshToken(user.id);
  const jti = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString()).jti;
  const expiresIn = parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '1800');

  if (!NO_DB_MODE) {
    await prisma.session.create({
      data: {
        userId: user.id,
        jti,
        refreshToken,
        authMethod,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        refreshExpiresAt: new Date(Date.now() + parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '604800') * 1000),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  }

  return { accessToken, refreshToken, expiresIn, tokenType: 'Bearer' as const };
}

export async function registerBegin(req: Request, res: Response) {
  try {
    const { email, name } = req.body;
    let user = NO_DB_MODE
      ? { id: devUserIdForEmail(email), email, name: name || email.split('@')[0], role: 'STUDENT', studentId: null, isActive: true, credentials: [] as any[] }
      : await prisma.user.findUnique({ where: { email }, include: { credentials: { where: { isRevoked: false } } } });
      
    if (!user && !NO_DB_MODE) {
      // Create user if they don't exist
      const generatedStudentId = 'VTU' + Math.floor(10000 + Math.random() * 90000);
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0], // Use provided name or default to email part
          studentId: generatedStudentId,
          role: 'STUDENT',
        },
        include: { credentials: { where: { isRevoked: false } } }
      }) as any;
      logger.info(`Created new user during registration: ${email}`);
    } else if (!user) {
        return res.status(404).json({ success: false, error: 'User not found. Contact admin.' });
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: isoBase64URL.fromBuffer(Buffer.from(user!.id)),
      userName: user!.email,
      userDisplayName: user!.name,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',   // 'preferred' allows PIN fallback
        residentKey: 'preferred',
      },
      excludeCredentials: user!.credentials.map((c: any) => ({ id: c.credentialId, type: 'public-key' as const })) as any,
    });

    await storeChallenge(user!.id, options.challenge, 'register');
    if (!NO_DB_MODE) {
      await logAuditEvent({ userId: user!.id, action: 'FIDO2_REGISTER_BEGIN', status: 'SUCCESS', ipAddress: req.ip });
    }
    res.json({ success: true, data: { options, userId: user!.id } });
  } catch (err: any) {
    logger.error('registerBegin:', err);
    res.status(500).json({ success: false, error: 'Registration init failed' });
  }
}

export async function registerComplete(req: Request, res: Response) {
  try {
    const { userId, response } = req.body as { userId: string; response: RegistrationResponseJSON };
    const challenge = await getChallenge(userId, 'register');
    if (!challenge) return res.status(400).json({ success: false, error: 'Challenge expired' });

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      await logAuditEvent({ userId, action: 'FIDO2_REGISTER_FAILED', status: 'FAILURE', ipAddress: req.ip });
      return res.status(400).json({ success: false, error: 'Registration verification failed' });
    }

    const regInfo = verification.registrationInfo as any;
    const { credentialDeviceType, credentialBackedUp, aaguid } = regInfo;
    
    // Support v9 (credentialID) and v10 (credential.id)
    const credIdStr = regInfo.credential?.id || (regInfo.credentialID ? isoBase64URL.fromBuffer(regInfo.credentialID) : undefined);
    const pubKeyBytes = regInfo.credential?.publicKey || regInfo.credentialPublicKey;
    const credCounter = regInfo.credential?.counter ?? regInfo.counter ?? 0;

    if (!credIdStr || !pubKeyBytes) {
      return res.status(400).json({ success: false, error: 'Registration payload invalid' });
    }

    if (NO_DB_MODE) {
      await storeDevWebAuthnCredential(userId, {
        credentialId: credIdStr,
        publicKey: isoBase64URL.fromBuffer(pubKeyBytes),
        counter: Number(credCounter),
        deviceType: credentialDeviceType ?? null,
        backedUp: credentialBackedUp ?? null,
        transports: (response.response.transports || []) as string[],
        aaguid: aaguid ?? null,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      });
      await setAnyDevWebAuthnCredentialPointer(userId, credIdStr);
    } else {
      await prisma.fidoCredential.create({
        data: {
          userId,
          credentialId: credIdStr,
          publicKey: isoBase64URL.fromBuffer(pubKeyBytes),
          counter: BigInt(credCounter),
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
          transports: (response.response.transports || []) as string[],
          aaguid,
        },
      });
    }

    await deleteChallenge(userId, 'register');
    if (!NO_DB_MODE) {
      await logAuditEvent({ userId, action: 'FIDO2_REGISTER_SUCCESS', status: 'SUCCESS', ipAddress: req.ip });
    }
    res.json({ success: true, message: 'Device registered successfully' });
  } catch (err: any) {
    logger.error('registerComplete:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
}

export async function loginBegin(req: Request, res: Response) {
  try {
    const { email } = req.body;
    const userId = NO_DB_MODE ? devUserIdForEmail(email) : null;
    const user = NO_DB_MODE
      ? { id: userId!, email, name: 'Dev User', role: 'STUDENT', studentId: null, isActive: true, credentials: [] as any[] }
      : await prisma.user.findUnique({ where: { email }, include: { credentials: { where: { isRevoked: false } } } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!NO_DB_MODE && !user.isActive) return res.status(403).json({ success: false, error: 'Account disabled' });

    const failures = await getFailedAttempts(email);
    if (failures >= MAX_FAILED) return res.status(429).json({ success: false, error: 'Account locked. Use OTP or contact admin.' });

    if (NO_DB_MODE) {
      const anyCred = await getAnyDevWebAuthnCredential(user.id);
      if (!anyCred) {
        return res.json({ success: true, data: { requireOTP: true, userId: user.id, message: 'No biometric registered. Use OTP.' } });
      }

      const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        userVerification: 'required',
        allowCredentials: [{ id: anyCred.credentialId, type: 'public-key' as const, transports: (anyCred.transports || []) as any }] as any,
      });

      await storeChallenge(user.id, options.challenge, 'login');
      return res.json({ success: true, data: { options, userId: user.id } });
    }

    if (user.credentials.length === 0) {
      return res.json({ success: true, data: { requireOTP: true, userId: user.id, message: 'No biometric registered. Use OTP.' } });
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
      allowCredentials: user.credentials.map((c: any) => ({ id: c.credentialId, type: 'public-key' as const, transports: c.transports as any })) as any,
    });

    await storeChallenge(user.id, options.challenge, 'login');
    res.json({ success: true, data: { options, userId: user.id } });
  } catch (err: any) {
    logger.error('loginBegin:', err);
    res.status(500).json({ success: false, error: 'Login init failed' });
  }
}

export async function loginComplete(req: Request, res: Response) {
  try {
    const { userId, response } = req.body as { userId: string; response: AuthenticationResponseJSON };
    const user = NO_DB_MODE
      ? { id: userId, email: 'dev@veltech.edu.in', name: 'Dev User', role: 'STUDENT', studentId: null, isActive: true }
      : await prisma.user.findUnique({ where: { id: userId }, include: { credentials: { where: { credentialId: response.id, isRevoked: false } } } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const credential = NO_DB_MODE
      ? await getDevWebAuthnCredential(userId, (response as any).id)
      : (user as any).credentials?.[0];
    if (!credential) return res.status(400).json({ success: false, error: 'Credential not found' });

    const challenge = await getChallenge(userId, 'login');
    if (!challenge) return res.status(400).json({ success: false, error: 'Challenge expired' });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      authenticator: { // v9 compat
        credentialID: isoBase64URL.toBuffer(NO_DB_MODE ? (credential as any).credentialId : (credential as any).credentialId),
        credentialPublicKey: isoBase64URL.toBuffer((credential as any).publicKey),
        counter: Number((credential as any).counter),
        transports: ((credential as any).transports || []) as any,
      },
      credential: { // v10 compat
        id: NO_DB_MODE ? (credential as any).credentialId : (credential as any).credentialId,
        publicKey: isoBase64URL.toBuffer((credential as any).publicKey),
        counter: Number((credential as any).counter),
        transports: ((credential as any).transports || []) as any,
      } as any,
      requireUserVerification: true,
    } as any);

    if (!verification.verified) {
      await incrementFailedAttempts(user.email);
      if (!NO_DB_MODE) {
        await logAuditEvent({ userId, action: 'FIDO2_LOGIN_FAILED', status: 'FAILURE', ipAddress: req.ip });
      }
      return res.status(401).json({ success: false, error: 'Biometric verification failed' });
    }

    if (NO_DB_MODE) {
      await storeDevWebAuthnCredential(userId, {
        ...(credential as any),
        counter: Number(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date().toISOString(),
      });
    } else {
      await prisma.fidoCredential.update({ where: { id: credential.id }, data: { counter: BigInt(verification.authenticationInfo.newCounter), lastUsedAt: new Date() } });
    }
    await deleteChallenge(userId, 'login');
    await resetFailedAttempts(user.email);

    const tokens = await issueTokenPair(user, AuthMethodEnum.FIDO2_WEBAUTHN, req);
    if (!NO_DB_MODE) {
      await logAuditEvent({ userId, action: 'FIDO2_LOGIN_SUCCESS', status: 'SUCCESS', ipAddress: req.ip, metadata: { authMethod: 'FIDO2' } });
    }

    res.json({ success: true, data: { ...tokens, user: { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role, 
      studentId: user.studentId,
      ...(NO_DB_MODE ? {
        lmsEnrollments: [
          {
            id: 'lms-mock-1',
            courseCode: 'CS301',
            courseName: 'Advanced Web Development',
            faculty: 'Dr. Smith',
            credits: 4,
            semester: 5,
            attendance: 88.5,
            grade: 'A',
            assignments: [
              { id: 'asgn-1', title: 'Project Phase 1', dueDate: new Date('2026-04-01').toISOString(), maxMarks: 50, obtainedMarks: 45, status: 'graded' },
              { id: 'asgn-2', title: 'Final Project', dueDate: new Date('2026-05-15').toISOString(), maxMarks: 100, status: 'pending' },
            ]
          }
        ],
        feeRecords: [
          {
            id: 'fee-mock-1',
            description: 'Tuition Fee - Semester 5',
            amount: 50000,
            dueDate: new Date('2026-01-15').toISOString(),
            paidDate: new Date('2026-01-14').toISOString(),
            status: 'PAID',
            semester: 5
          }
        ],
        bookIssues: [
          {
            id: 'book-mock-1',
            book: { title: 'Effective Java', author: 'Joshua Bloch', isbn: '978-0134685991' },
            issueDate: new Date('2026-03-01').toISOString(),
            dueDate: new Date('2026-03-15').toISOString(),
            status: 'ISSUED'
          }
        ],
        messages: [
          {
            id: 'msg-mock-1',
            subject: 'Welcome to Portals!',
            body: 'Your portal accounts have been provisioned successfully.',
            isRead: false,
            sender: { name: 'Campus Admin' }
          }
        ]
      } : {})
    } } });
  } catch (err: any) {
    logger.error('loginComplete:', err);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
}

export async function sendOTP(req: Request, res: Response) {
  try {
    const { email } = req.body;
    let user: any = null;
    if (NO_DB_MODE) {
      user = {
        id: devUserIdForEmail(email),
        email,
        name: 'Dev User',
        role: 'STUDENT',
        studentId: null,
        isActive: true,
      };
    } else {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      if (!user.isActive) return res.status(403).json({ success: false, error: 'Account disabled' });
    }

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    await storeOTP(user.id, otpHash);
    await sendOTPPush(email, otp);
    if (!NO_DB_MODE) {
      await logAuditEvent({ userId: user.id, action: 'OTP_SENT', status: 'SUCCESS', ipAddress: req.ip });
    }

    res.json({ success: true, data: { userId: user.id, message: 'OTP sent' } });
  } catch (err: any) {
    logger.error('sendOTP:', err);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
}

export async function verifyOTPHandler(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;
    let user: any = null;
    if (NO_DB_MODE) {
      user = {
        id: devUserIdForEmail(email),
        email,
        name: 'Dev User',
        role: 'STUDENT',
        studentId: null,
        isActive: true,
      };
    } else {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    }

    const otpHash = await getOTP(user.id);
    if (!otpHash) return res.status(400).json({ success: false, error: 'OTP expired. Request a new one.' });

    const failures = await getFailedAttempts(`otp:${user.id}`);
    if (failures >= 3) return res.status(429).json({ success: false, error: 'Too many attempts. Request new OTP.' });

    const valid = await verifyOTP(otp, otpHash);
    if (!valid) {
      await incrementFailedAttempts(`otp:${user.id}`);
      await logAuditEvent({ userId: user.id, action: 'OTP_VERIFY_FAILED', status: 'FAILURE', ipAddress: req.ip });
      return res.status(401).json({ success: false, error: 'Invalid OTP' });
    }

    await deleteOTP(user.id);
    await resetFailedAttempts(`otp:${user.id}`);

    const hasCredential = NO_DB_MODE
      ? false
      : (await prisma.fidoCredential.count({ where: { userId: user.id, isRevoked: false } })) > 0;
    const tokens = await issueTokenPair(user, AuthMethodEnum.OTP, req);
    if (!NO_DB_MODE) {
      await logAuditEvent({ userId: user.id, action: 'OTP_LOGIN_SUCCESS', status: 'SUCCESS', ipAddress: req.ip });
    }

    res.json({ success: true, data: { ...tokens, user: { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      role: user.role, 
      studentId: user.studentId,
      ...(NO_DB_MODE ? {
        lmsEnrollments: [
          {
            id: 'lms-mock-1',
            courseCode: 'CS301',
            courseName: 'Advanced Web Development',
            faculty: 'Dr. Smith',
            credits: 4,
            semester: 5,
            attendance: 88.5,
            grade: 'A',
            assignments: [
              { id: 'asgn-1', title: 'Project Phase 1', dueDate: new Date('2026-04-01').toISOString(), maxMarks: 50, obtainedMarks: 45, status: 'graded' },
              { id: 'asgn-2', title: 'Final Project', dueDate: new Date('2026-05-15').toISOString(), maxMarks: 100, status: 'pending' },
            ]
          }
        ],
        feeRecords: [
          {
            id: 'fee-mock-1',
            description: 'Tuition Fee - Semester 5',
            amount: 50000,
            dueDate: new Date('2026-01-15').toISOString(),
            paidDate: new Date('2026-01-14').toISOString(),
            status: 'PAID',
            semester: 5
          }
        ],
        bookIssues: [
          {
            id: 'book-mock-1',
            book: { title: 'Effective Java', author: 'Joshua Bloch', isbn: '978-0134685991' },
            issueDate: new Date('2026-03-01').toISOString(),
            dueDate: new Date('2026-03-15').toISOString(),
            status: 'ISSUED'
          }
        ],
        messages: [
          {
            id: 'msg-mock-1',
            subject: 'Welcome to Portals!',
            body: 'Your portal accounts have been provisioned successfully.',
            isRead: false,
            sender: { name: 'Campus Admin' }
          }
        ]
      } : {})
    }, hasCredential } });
  } catch (err: any) {
    logger.error('verifyOTP:', err);
    res.status(500).json({ success: false, error: 'OTP verification failed' });
  }
}

export async function refreshTokenHandler(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

    verifyRefreshToken(refreshToken); // throws if invalid
    const session = await prisma.session.findFirst({ where: { refreshToken, isRevoked: false, refreshExpiresAt: { gt: new Date() } }, include: { user: true } });
    if (!session) return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });

    await prisma.session.update({ where: { id: session.id }, data: { isRevoked: true } });
    const tokens = await issueTokenPair(session.user, session.authMethod, req);
    await logAuditEvent({ userId: session.userId, action: 'TOKEN_REFRESHED', status: 'SUCCESS', ipAddress: req.ip });

    res.json({ success: true, data: tokens });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token refresh failed' });
  }
}

export async function revokeSession(req: Request, res: Response) {
  try {
    const user = req.user!;
    const ttl = Math.max(user.exp - Math.floor(Date.now() / 1000), 1);
    await blacklistToken(user.jti, ttl);
    await prisma.session.updateMany({ where: { userId: user.userId, isRevoked: false }, data: { isRevoked: true } });
    await logAuditEvent({ userId: user.userId, action: 'SESSION_REVOKED', status: 'SUCCESS', ipAddress: req.ip });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
}

export async function getJWKSHandler(_req: Request, res: Response) {
  res.json(getJWKS());
}

export async function getMe(req: Request, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, studentId: true, isActive: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
}
