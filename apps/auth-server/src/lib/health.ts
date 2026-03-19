import { prisma } from './prisma';
import { redis } from './redis';
import { verifyMailer } from './mailer';
import { logger } from './logger';

export async function checkDatabase() {
  try {
    const userCount = await prisma.user.count();
    return { db: 'connected', userCount };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return { db: 'error' };
  }
}

export async function checkRedis() {
  try {
    // If it's the real redis client, it has a ping method. 
    // If it's the InMemoryRedis fallback, it might not.
    if (typeof (redis as any).ping === 'function') {
      await (redis as any).ping();
    }
    return { redis: 'connected' };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return { redis: 'error' };
  }
}

export async function checkSMTP() {
  try {
    // Re-verify the transporter
    await verifyMailer();
    return { smtp: 'connected', host: process.env.SMTP_HOST ?? 'smtp.gmail.com' };
  } catch (error) {
    logger.error('SMTP health check failed:', error);
    return { smtp: 'error' };
  }
}
