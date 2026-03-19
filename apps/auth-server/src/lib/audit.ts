import { prisma } from './prisma';
import { broadcastAuditEvent } from './auditWebSocket';
import { logger } from './logger';

const NO_DB_MODE = process.env.AUTH_NO_DB === 'true' || process.env.AUTH_NO_DB === '1';

export async function logAuditEvent(params: {
  userId?: string;
  action: string;
  status: 'SUCCESS' | 'FAILURE' | 'WARNING';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    if (NO_DB_MODE) {
      // Dev mode without DB: just broadcast to WebSocket and skip Prisma
      broadcastAuditEvent({
        action: params.action,
        status: params.status,
        userEmail: undefined,
        metadata: params.metadata,
      });
      return;
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        status: params.status as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata as any,
      },
      include: { user: { select: { email: true } } },
    });

    // Broadcast to WebSocket clients (admin dashboard)
    broadcastAuditEvent({
      action: params.action,
      status: params.status,
      userEmail: log.user?.email,
      metadata: params.metadata,
    });
  } catch (err) {
    logger.error('Failed to write audit log:', err);
  }
}
