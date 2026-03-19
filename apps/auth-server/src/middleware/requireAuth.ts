import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';
import type { JWTPayload } from '@authsphere/shared';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function requireAuth(audience?: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Missing authorization header' });
      return;
    }

    const token = header.slice(7);
    try {
      const payload = await verifyToken(token);

      // Validate audience if required
      if (audience && !payload.aud.includes(audience)) {
        res.status(403).json({ success: false, error: 'Token not authorized for this portal' });
        return;
      }

      req.user = payload;
      next();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid token';
      res.status(401).json({ success: false, error: msg });
    }
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
