import bcrypt from 'bcryptjs';
import { logger } from './logger';
import { sendOTPEmail } from './mailer';

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * Send OTP via email (and optionally Firebase FCM).
 * Falls back to Ethereal in dev so you always get a preview URL
 * even without real SMTP credentials.
 */
export async function sendOTPPush(
  email: string,
  otp: string,
  displayName = 'Student'
): Promise<void> {
  // Always log in dev for quick debugging
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`\n📱 [DEV] OTP for ${email}: ${otp}\n`);
  }

  try {
    const { previewUrl } = await sendOTPEmail(email, otp, displayName);
    if (previewUrl) {
      logger.info(`\n👉 [DEV] View email at: ${previewUrl}\n`);
    }
  } catch (err: any) {
    // Non-critical: log but don't crash the OTP flow
    logger.error(`[otp] Failed to send email to ${email}: ${err.message}`);
    // In production, re-throw so the caller knows delivery failed
    if (process.env.NODE_ENV === 'production') throw err;
  }
}

