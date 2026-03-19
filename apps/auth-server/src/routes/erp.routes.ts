import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

const NO_DB_MODE = process.env.AUTH_NO_DB === 'true' || process.env.AUTH_NO_DB === '1';

const MOCK_FEES = [
  {
    id: 'fee-mock-1',
    description: 'Tuition Fee - Semester 5',
    amount: 50000,
    dueDate: new Date('2026-01-15').toISOString(),
    paidDate: new Date('2026-01-14').toISOString(),
    status: 'PAID',
    semester: 5,
    fine: 0
  }
];

const MOCK_HOSTEL = {
  id: 'hostel-mock-1',
  block: 'A',
  roomNumber: '101',
  bedNumber: 1,
  joinDate: new Date('2025-08-01').toISOString(),
  monthlyRent: 5000
};

const MOCK_TRANSPORT = {
  id: 'transport-mock-1',
  routeNumber: 'R-10',
  routeName: 'City Center Route',
  pickupPoint: 'Main Square',
  passExpiry: new Date('2026-12-31').toISOString(),
  isActive: true
};

router.get('/dashboard', async (req, res) => {
  try {
    if (NO_DB_MODE) {
      const fees = MOCK_FEES.map(f => ({ ...f, due_date: f.dueDate, paid_at: f.paidDate }));
      const hostel = { ...MOCK_HOSTEL, room_no: MOCK_HOSTEL.roomNumber, allocated_at: MOCK_HOSTEL.joinDate };
      const transport = { ...MOCK_TRANSPORT, route_name: MOCK_TRANSPORT.routeName, valid_until: MOCK_TRANSPORT.passExpiry, stops: MOCK_TRANSPORT.pickupPoint, departure_time: '08:00 AM' };
      const pending_fees = MOCK_FEES.filter(f => f.status !== 'PAID').reduce((s, f) => s + f.amount + f.fine, 0);
      return res.json({ success: true, data: {
        student: { display_name: 'Mock User', student_id: 'MOCK-123', dept: 'Mock Dept' },
        fees, hostel, transport, pending_fees
      }});
    }

    const uid = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: uid } });
    const [rawFees, rawHostel, rawTransport] = await Promise.all([
      prisma.feeRecord.findMany({ where: { userId: uid }, orderBy: { dueDate: 'desc' } }),
      prisma.hostelAllotment.findUnique({ where: { userId: uid } }),
      prisma.transportPass.findUnique({ where: { userId: uid } }),
    ]);

    const fees = rawFees.map(f => ({
      id: f.id,
      semester: f.semester,
      amount: f.amount,
      due_date: f.dueDate,
      paid_at: f.paidDate,
      status: f.status.toLowerCase(),
      description: f.description
    }));

    let hostel = null;
    if (rawHostel) {
      hostel = {
        room_no: rawHostel.roomNumber,
        block: rawHostel.block,
        allocated_at: rawHostel.joinDate
      };
    }

    let transport = null;
    if (rawTransport) {
      transport = {
        route_name: rawTransport.routeName,
        stops: rawTransport.pickupPoint,
        departure_time: '08:00 AM', // Adding a default mock since schema lacks it
        valid_until: rawTransport.passExpiry
      };
    }

    const pending_fees = fees.filter(f => f.status !== 'paid').reduce((s, f) => s + f.amount, 0);

    res.json({
      success: true,
      data: {
        student: {
          display_name: user?.name || user?.email || 'Student',
          student_id: user?.studentId || 'N/A',
          dept: 'Computer Science' // Model lacks dept, using fallback
        },
        fees,
        hostel,
        transport,
        pending_fees
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch ERP data' });
  }
});

router.get('/fees', async (req, res) => {
  if (NO_DB_MODE) return res.json({ success: true, data: MOCK_FEES });
  const fees = await prisma.feeRecord.findMany({ where: { userId: req.user!.userId }, orderBy: { dueDate: 'desc' } });
  res.json({ success: true, data: fees });
});

router.get('/hostel', async (req, res) => {
  if (NO_DB_MODE) return res.json({ success: true, data: MOCK_HOSTEL });
  const hostel = await prisma.hostelAllotment.findUnique({ where: { userId: req.user!.userId } });
  res.json({ success: true, data: hostel });
});

router.get('/transport', async (req, res) => {
  if (NO_DB_MODE) return res.json({ success: true, data: MOCK_TRANSPORT });
  const transport = await prisma.transportPass.findUnique({ where: { userId: req.user!.userId } });
  res.json({ success: true, data: transport });
});

export { router as erpRouter };
