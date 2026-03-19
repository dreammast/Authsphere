import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const NO_DB_MODE = process.env.AUTH_NO_DB === 'true' || process.env.AUTH_NO_DB === '1';

const MOCK_MESSAGES = [
  {
    id: 'msg-mock-1',
    subject: 'Welcome to Portals!',
    body: 'Your portal accounts have been provisioned successfully. You can now access LMS, ERP, and Library services directly without logging in again.',
    isRead: false,
    createdAt: new Date().toISOString(),
    sender: { name: 'Campus Admin', email: 'admin@veltech.edu.in' }
  }
];

router.get('/inbox', async (req, res) => {
  if (NO_DB_MODE) {
    const messages = MOCK_MESSAGES.map(m => ({
      ...m,
      sent_at: m.createdAt,
      read_at: m.isRead ? m.createdAt : null, // mock read_at
      sender_name: m.sender.name
    }));
    return res.json({ success: true, data: messages });
  }
  
  const rawMessages = await prisma.message.findMany({
    where: { recipientId: req.user!.userId },
    include: { sender: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const messages = rawMessages.map(m => ({
    id: m.id,
    subject: m.subject,
    body: m.body,
    sent_at: m.createdAt,
    read_at: m.isRead ? m.createdAt : null, 
    sender_name: m.sender.name
  }));

  res.json({ success: true, data: messages });
});

router.get('/messages/:id', async (req, res) => {
  if (NO_DB_MODE) {
    const msg = MOCK_MESSAGES.find(m => m.id === req.params.id) || MOCK_MESSAGES[0];
    return res.json({ success: true, data: msg });
  }

  const msg = await prisma.message.findFirst({ where: { id: req.params.id, recipientId: req.user!.userId }, include: { sender: { select: { name: true, email: true } } } });
  if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });
  await prisma.message.update({ where: { id: msg.id }, data: { isRead: true } });
  res.json({ success: true, data: msg });
});

router.post('/compose', validate(z.object({
  recipientEmail: z.string().email().endsWith('@veltech.edu.in'),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
})), async (req, res) => {
  try {
    const { recipientEmail, subject, body } = req.body;
    const recipient = await prisma.user.findUnique({ where: { email: recipientEmail } });
    if (!recipient) return res.status(404).json({ success: false, error: 'Recipient not found' });

    const msg = await prisma.message.create({ data: { senderId: req.user!.userId, recipientId: recipient.id, subject, body } });
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

router.patch('/messages/:id/read', async (req, res) => {
  if (NO_DB_MODE) return res.json({ success: true });
  await prisma.message.updateMany({ where: { id: req.params.id, recipientId: req.user!.userId }, data: { isRead: true } });
  res.json({ success: true });
});

export { router as emailRouter };
