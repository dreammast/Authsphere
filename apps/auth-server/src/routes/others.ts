import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import type { AuthRequest } from '../middleware/requireAuth';

// ── LIBRARY ──────────────────────────────────────────────────
export const libraryRouter = Router();
libraryRouter.use(requireAuth('library'));

libraryRouter.get('/dashboard', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.user!.sub } });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    const issued = await prisma.bookIssue.findMany({
      where: { student_id: user.id, returned_at: null },
      include: { book: true },
    });
    const catalogue = await prisma.book.findMany({ take: 20 });
    res.json({ success: true, data: { issued: issued.map((i) => ({ ...i, title: i.book.title, author: i.book.author })), catalogue } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load library' });
  }
});

libraryRouter.get('/issued', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.user!.sub } });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    const issued = await prisma.bookIssue.findMany({
      where: { student_id: user.id },
      include: { book: true },
      orderBy: { issued_at: 'desc' },
    });
    res.json({ success: true, data: issued.map((i) => ({ ...i, title: i.book.title, author: i.book.author, isbn: i.book.isbn })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch issued books' });
  }
});

libraryRouter.get('/catalogue', async (_req, res) => {
  try {
    const books = await prisma.book.findMany({ orderBy: { title: 'asc' } });
    res.json({ success: true, data: books });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch catalogue' });
  }
});

// ── EMAIL ────────────────────────────────────────────────────
export const emailRouter = Router();
emailRouter.use(requireAuth('email'));

emailRouter.get('/inbox', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.user!.sub } });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    const messages = await prisma.message.findMany({
      where:   { recipient_id: user.id },
      include: { sender: { select: { display_name: true, email: true } } },
      orderBy: { sent_at: 'desc' },
    });
    res.json({ success: true, data: messages.map((m) => ({ ...m, sender_name: m.sender.display_name })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch inbox' });
  }
});

emailRouter.post('/compose', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.user!.sub } });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    const { to, subject, body } = req.body as { to: string; subject: string; body: string };
    const recipient = await prisma.user.findUnique({ where: { email: to } });
    if (!recipient) { res.status(404).json({ success: false, error: 'Recipient not found' }); return; }
    const msg = await prisma.message.create({ data: { sender_id: user.id, recipient_id: recipient.id, subject, body } });
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

emailRouter.patch('/inbox/:id/read', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.user!.sub } });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    await prisma.message.updateMany({ where: { id: req.params.id, recipient_id: user.id }, data: { read_at: new Date() } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to mark read' });
  }
});

// ── AUDIT ────────────────────────────────────────────────────
export const auditRouter = Router();
auditRouter.use(requireAuth());

auditRouter.get('/events', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.user!.sub } });
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

    const where = req.user!.role === 'admin' ? {} : { user_id: user.id };
    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take:    50,
      include: { user: { select: { email: true, display_name: true } } },
    });

    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch audit events' });
  }
});

// ── ADMIN ────────────────────────────────────────────────────
export const adminRouter = Router();
const { requireRole } = require('../middleware/requireAuth');
adminRouter.use(requireAuth('admin'));
adminRouter.use(requireRole('admin'));

adminRouter.get('/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        credentials: { where: { revoked_at: null }, select: { id: true, device_name: true, created_at: true } },
        sessions:    { orderBy: { issued_at: 'desc' }, take: 1 },
      },
      orderBy: { created_at: 'asc' },
    });
    res.json({ success: true, data: users.map((u) => ({ ...u, has_fido2: u.credentials.length > 0, last_session: u.sessions[0] ?? null })) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

adminRouter.get('/stats', async (_req, res) => {
  try {
    const [totalUsers, activeSessions, fido2Count, recentEvents] = await Promise.all([
      prisma.user.count(),
      prisma.session.count({ where: { revoked: false, expires_at: { gt: new Date() } } }),
      prisma.credential.count({ where: { revoked_at: null } }),
      prisma.auditEvent.count({ where: { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);
    res.json({ success: true, data: { totalUsers, activeSessions, fido2Count, recentEvents } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

adminRouter.post('/users/:id/revoke-device', async (req, res) => {
  try {
    await prisma.credential.updateMany({ where: { user_id: req.params.id }, data: { revoked_at: new Date() } });
    res.json({ success: true, message: 'All devices revoked for user' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to revoke devices' });
  }
});

adminRouter.post('/users/:id/lock', async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { locked_at: new Date() } });
    res.json({ success: true, message: 'User account locked' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to lock user' });
  }
});
