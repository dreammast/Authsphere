import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { authRouter } from './routes/auth.routes';
import { lmsRouter } from './routes/lms.routes';
import { erpRouter } from './routes/erp.routes';
import { libraryRouter } from './routes/library.routes';
import { emailRouter } from './routes/email.routes';
import { adminRouter } from './routes/admin.routes';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { verifyMailer } from './lib/mailer';
import { logger } from './lib/logger';
import { setupAuditWebSocket } from './lib/auditWebSocket';
import { checkDatabase, checkRedis, checkSMTP } from './lib/health';

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws/audit' });

// ── Security & CORS ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174').split(',').map(s => s.trim());
logger.info(`🌐 Allowed CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);

const corsOptions = {
  origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    logger.warn(`[CORS] Blocked origin: ${origin}`);
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200, // some legacy browsers choke on 204
};

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ← CRITICAL: handle preflight for every route
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger); // ← log all requests
app.use(rateLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/lms', lmsRouter);
app.use('/api/erp', erpRouter);
app.use('/api/library', libraryRouter);
app.use('/api/email', emailRouter);
app.use('/api/admin', adminRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'AuthSphere Auth Server', ts: new Date().toISOString() });
});

app.get('/health/db', async (_, res) => {
  res.json(await checkDatabase());
});

app.get('/health/redis', async (_, res) => {
  res.json(await checkRedis());
});

app.get('/health/smtp', async (_, res) => {
  res.json(await checkSMTP());
});

// ── WebSocket audit stream ────────────────────────────────────────────────────
setupAuditWebSocket(wss);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.AUTH_SERVER_PORT || '4000');
httpServer.listen(PORT, async () => {
  logger.info(`🔐 AuthSphere server running on http://localhost:${PORT}`);
  logger.info(`📡 WebSocket audit stream: ws://localhost:${PORT}/ws/audit`);
  logger.info(`🔑 Environment: ${process.env.NODE_ENV}`);

  // ── Startup Diagnostics ──────────────────────────────────────────────────
  const RP_ID  = process.env.RP_ID;
  const ORIGIN = process.env.ORIGIN;

  if (!RP_ID || !ORIGIN) {
    logger.error('FATAL: RP_ID and ORIGIN must be set in .env for WebAuthn to work');
    process.exit(1);
  }

  if (!ORIGIN.includes(RP_ID)) {
    logger.warn(`WARNING: ORIGIN "${ORIGIN}" does not contain RP_ID "${RP_ID}"`);
    logger.warn('WebAuthn will fail. Check your .env file.');
  }

  // Startup Health Checks
  logger.info('🔍 Running startup health checks...');
  const dbHealth = await checkDatabase();
  const redisHealth = await checkRedis();
  const smtpHealth = await checkSMTP();

  logger.info(`🗄️  Database: ${dbHealth.db === 'connected' ? 'CONNECTED ✓' : 'FAILED ✗'}`);
  if (dbHealth.db === 'connected') logger.info(`📊 User Count: ${dbHealth.userCount}`);
  
  logger.info(`🧠 Redis: ${redisHealth.redis === 'connected' ? 'CONNECTED ✓' : 'FAILED ✗'}`);
  logger.info(`📧 SMTP: ${smtpHealth.smtp === 'connected' ? 'CONNECTED ✓' : 'FAILED ✗'}`);

  await verifyMailer();
});

export { wss };
