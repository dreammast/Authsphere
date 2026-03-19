import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { logAuditEvent } from '../lib/audit';
import { authenticate, requireRole } from '../middleware/authenticate';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
router.get('/dashboard/stats', async (req: any, res) => {
  try {
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const feeCollectedThisMonth = await prisma.feeRecord.aggregate({
      where: { status: 'PAID', paidDate: { gte: startOfMonth } },
      _sum: { amount: true, fine: true }
    });

    const pendingDues = await prisma.feeRecord.aggregate({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
      _sum: { amount: true, fine: true }
    });

    const defaultersRaw = await prisma.feeRecord.groupBy({
      by: ['userId'],
      where: { status: 'OVERDUE' }
    });
    const defaultersCount = defaultersRaw.length;

    let activeSessionsCount = 0;
    try {
      const keys = await redis.keys('session:*');
      activeSessionsCount = keys.length;
    } catch {
       const sessionsCount = await prisma.session.count({ where: { isRevoked: false, expiresAt: { gt: new Date() } } });
       activeSessionsCount = sessionsCount;
    }

    const studentsWithFido = await prisma.user.count({
      where: { role: 'STUDENT', credentials: { some: { isRevoked: false } } }
    });
    const fidoAdoptionRate = totalStudents > 0 ? ((studentsWithFido / totalStudents) * 100).toFixed(1) : '0.0';

    const booksOverdue = await prisma.bookIssue.count({ where: { status: 'OVERDUE' } });

    res.json({
      success: true,
      data: {
        totalStudents,
        feeCollectedThisMonth: (feeCollectedThisMonth._sum.amount || 0) + (feeCollectedThisMonth._sum.fine || 0),
        pendingDues: (pendingDues._sum.amount || 0) + (pendingDues._sum.fine || 0),
        defaultersCount,
        activeSessionsCount,
        fidoAdoptionRate: parseFloat(fidoAdoptionRate),
        booksOverdue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.get('/dashboard/fee-chart', async (req: any, res) => {
  try {
    const monthsBack = 6;
    const date = new Date();
    date.setMonth(date.getMonth() - monthsBack + 1);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);

    const records = await prisma.feeRecord.findMany({
      where: { status: 'PAID', paidDate: { gte: date } },
      select: { amount: true, fine: true, paidDate: true }
    });

    const monthlyData: Record<string, number> = {};
    for (let i = 0; i < monthsBack; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = d.toLocaleString('default', { month: 'short', year: 'numeric' });
        monthlyData[monthKey] = 0;
    }

    records.forEach(r => {
      const d = r.paidDate as Date;
      const key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (monthlyData[key] !== undefined) {
        monthlyData[key] += r.amount + r.fine;
      }
    });

    const chartData = Object.entries(monthlyData).map(([month, total]) => ({ month, total })).reverse();
    res.json({ success: true, data: chartData });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.get('/dashboard/defaulters', async (req: any, res) => {
  try {
    const topDefaulters = await prisma.feeRecord.findMany({
      where: { status: 'OVERDUE' },
      include: { user: { select: { id: true, name: true, studentId: true, email: true } } },
      orderBy: { fine: 'desc' },
      take: 10
    });
    res.json({ success: true, data: topDefaulters });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// ─────────────────────────────────────────────
// FEES
// ─────────────────────────────────────────────
router.get('/fees/overview', async (req, res) => {
  try {
    const feeRecords = await prisma.feeRecord.findMany({
      select: { amount: true, fine: true, status: true, semester: true }
    });
    let totalCollected = 0, totalPending = 0, totalOverdue = 0, totalFine = 0;
    const semesterMap: Record<number, any> = {};

    feeRecords.forEach(r => {
      if (!semesterMap[r.semester]) semesterMap[r.semester] = { collected: 0, pending: 0, overdue: 0, fine: 0 };
      const val = r.amount + r.fine;
      if (r.status === 'PAID') { totalCollected += val; semesterMap[r.semester].collected += val; }
      else if (r.status === 'PENDING') { totalPending += val; semesterMap[r.semester].pending += val; }
      else if (r.status === 'OVERDUE') { totalOverdue += r.amount; totalFine += r.fine; semesterMap[r.semester].overdue += r.amount; semesterMap[r.semester].fine += r.fine; }
    });
    res.json({ success: true, data: { summary: { totalCollected, totalPending, totalOverdue, totalFine }, semesters: semesterMap } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.post('/fees/collect', async (req: any, res) => {
  try {
    const { userId, description, semester, feeType, amount, paymentMode, transactionRef, paidDate } = req.body;
    const record = await prisma.feeRecord.create({
      data: {
        userId, description: description || `Fee Collection - ${feeType}`, amount: parseFloat(amount),
        dueDate: new Date(), paidDate: paidDate ? new Date(paidDate) : new Date(), status: 'PAID', semester: parseInt(semester), fine: 0,
      }
    });

    const receipt = await prisma.feePaymentReceipt.create({
      data: {
        feeRecordId: record.id, receiptNumber: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        paymentMode, transactionRef, collectedBy: req.user.id
      }
    });
    await logAuditEvent({ userId: req.user.id, action: 'FEE_COLLECTED', status: 'SUCCESS', metadata: { feeRecordId: record.id, amount, userId }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ success: true, data: { record, receipt } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed' });
  }
});

router.get('/fees/defaulters', async (req: any, res) => {
  try {
    const defaulters = await prisma.feeRecord.findMany({
      where: { status: 'OVERDUE' },
      include: { user: { select: { id: true, name: true, studentId: true, email: true } } },
      orderBy: { dueDate: 'asc' }
    });
    const transformed = defaulters.map(d => {
       const daysOverdue = Math.max(0, Math.floor((Date.now() - d.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
       return { ...d, daysOverdue, computedFine: daysOverdue * 50 };
    });
    res.json({ success: true, data: transformed });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.get('/fees/structure', async (req, res) => {
  try {
    const structures = await prisma.feeStructure.findMany({ orderBy: [{ program: 'asc' }, { semester: 'asc' }] });
    res.json({ success: true, data: structures });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.put('/fees/structure/:id', async (req: any, res) => {
  try {
    const data = req.body;
    const updated = await prisma.feeStructure.update({
      where: { id: req.params.id }, data: { ...data, updatedBy: req.user.id }
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// ─────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────
router.get('/students', async (req: any, res) => {
  try {
    const search = req.query.search as string;
    const skip = parseInt(req.query.skip as string || '0');
    const where = {
      role: 'STUDENT' as const,
      ...(search ? { OR: [ { name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }, { studentId: { contains: search, mode: 'insensitive' as const } } ] } : {})
    };
    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where, take: 20, skip, include: { credentials: { select: { isRevoked: false } }, feeRecords: { where: { status: 'OVERDUE' }, select: { amount: true } } },
        orderBy: { name: 'asc' }
      }),
      prisma.user.count({ where })
    ]);
    const mapped = students.map(s => ({
       id: s.id, name: s.name, email: s.email, studentId: s.studentId, isActive: s.isActive,
       fidoStatus: s.credentials.length > 0 ? 'Registered' : 'None', feeStatus: s.feeRecords.length > 0 ? 'Defaulter' : 'Clear'
    }));
    res.json({ success: true, data: { students: mapped, total } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.get('/students/:id', async (req: any, res) => {
  try {
    const student = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { feeRecords: true, lmsEnrollments: true, bookIssues: { include: { book: true } }, auditLogs: { take: 10, orderBy: { createdAt: 'desc' } } }
    });
    if (!student) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

// ─────────────────────────────────────────────
// SECURITY / USERS / MESSAGES
// ─────────────────────────────────────────────
router.get('/security/stats', async (req: any, res) => {
  try {
    const revocations = await prisma.fidoCredential.count({ where: { isRevoked: true } });
    res.json({ success: true, data: { revocations } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});
router.get('/policies', async (req: any, res) => {
  try {
    const policies = await prisma.systemPolicy.findMany();
    res.json({ success: true, data: policies });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});
router.put('/policies', async (req: any, res) => {
  try {
    const { key, value } = req.body;
    const updated = await prisma.systemPolicy.update({
      where: { key }, data: { value, updatedBy: req.user.id }
    });
    await logAuditEvent({ userId: req.user.id, action: 'POLICY_UPDATED', status: 'SUCCESS', metadata: { key, value }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { credentials: { where: { isRevoked: false }, select: { id: true, deviceType: true, lastUsedAt: true } }, sessions: { where: { isRevoked: false, expiresAt: { gt: new Date() } }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.get('/audit', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  res.json({ success: true, data: logs });
});

router.get('/stats', async (req, res) => {
  const [totalUsers, activeCredentials, activeSessions, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.fidoCredential.count({ where: { isRevoked: false } }),
    prisma.session.count({ where: { isRevoked: false, expiresAt: { gt: new Date() } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);
  res.json({ success: true, data: { totalUsers, activeCredentials, activeSessions, auditEventsToday: recentLogs } });
});

router.delete('/users/:id/credentials', async (req, res) => {
  await prisma.fidoCredential.updateMany({ where: { userId: req.params.id }, data: { isRevoked: true } });
  res.json({ success: true, message: 'Credentials revoked' });
});

export { router as adminRouter };
