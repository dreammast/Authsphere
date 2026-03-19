import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

const NO_DB_MODE = process.env.AUTH_NO_DB === 'true' || process.env.AUTH_NO_DB === '1';

const MOCK_ISSUED_BOOKS = [
  {
    id: 'book-mock-1',
    bookId: 'book-1',
    book: { title: 'Effective Java', author: 'Joshua Bloch', isbn: '978-0134685991' },
    issueDate: new Date('2026-03-01').toISOString(),
    dueDate: new Date('2026-03-15').toISOString(),
    status: 'ISSUED',
    fine: 0
  }
];

const MOCK_CATALOGUE = [
  { id: 'book-1', title: 'Effective Java', author: 'Joshua Bloch', isbn: '978-0134685991', category: 'Programming', totalCopies: 5, available: 4 },
  { id: 'book-2', title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0132350884', category: 'Programming', totalCopies: 3, available: 3 }
];

router.get('/dashboard', async (req, res) => {
  try {
    if (NO_DB_MODE) {
      const issued = MOCK_ISSUED_BOOKS.map((b: any) => ({
        id: b.id,
        title: b.book.title,
        author: b.book.author,
        issued_at: b.issueDate,
        due_date: b.dueDate,
        returned_at: null,
        fine_amount: b.fine
      }));
      const overdue = MOCK_ISSUED_BOOKS.filter((b: any) => b.status === 'OVERDUE');
      return res.json({ success: true, data: { issued, catalogue: [], stats: { total: issued.length, overdue: overdue.length, totalFine: overdue.reduce((s: number, b: any) => s + b.fine, 0) } } });
    }

    const uid = req.user!.userId;
    const rawIssued = await prisma.bookIssue.findMany({ where: { userId: uid }, include: { book: true }, orderBy: { issueDate: 'desc' } });
    const rawCatalogue = await prisma.book.findMany({ take: 6 });

    const issued = rawIssued.map(b => ({
      id: b.id,
      title: b.book.title,
      author: b.book.author,
      issued_at: b.issueDate,
      due_date: b.dueDate,
      returned_at: b.returnDate,
      fine_amount: b.fine
    }));

    const catalogue = rawCatalogue.map(b => ({
      id: b.id,
      title: b.title,
      author: b.author,
      category: b.category,
      copies_available: b.available,
      copies_total: b.totalCopies
    }));

    const overdue = rawIssued.filter(b => b.status === 'OVERDUE');
    res.json({ success: true, data: { issued, catalogue, stats: { total: issued.length, overdue: overdue.length, totalFine: overdue.reduce((s, b) => s + b.fine, 0) } } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch library data' });
  }
});

router.get('/issued', async (req, res) => {
  if (NO_DB_MODE) return res.json({ success: true, data: MOCK_ISSUED_BOOKS });
  const issues = await prisma.bookIssue.findMany({ where: { userId: req.user!.userId }, include: { book: true } });
  res.json({ success: true, data: issues });
});

router.get('/catalogue', async (req, res) => {
  if (NO_DB_MODE) {
    const search = (req.query.q as string || '').toLowerCase();
    const books = MOCK_CATALOGUE.filter(b => b.title.toLowerCase().includes(search) || b.author.toLowerCase().includes(search));
    return res.json({ success: true, data: books });
  }

  const search = req.query.q as string;
  const books = await prisma.book.findMany({
    where: search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { author: { contains: search, mode: 'insensitive' } }] } : {},
    take: 50,
  });
  res.json({ success: true, data: books });
});

export { router as libraryRouter };
