import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

const NO_DB_MODE = process.env.AUTH_NO_DB === 'true' || process.env.AUTH_NO_DB === '1';

const MOCK_LMS_COURSES = [
  {
    id: 'lms-mock-1',
    courseCode: 'CS301',
    courseName: 'Advanced Web Development',
    faculty: 'Dr. Smith',
    credits: 4,
    semester: 5,
    attendance: 88.5,
    grade: 'A',
    assignments: [
      { id: 'asgn-1', title: 'Project Phase 1', dueDate: new Date('2026-04-01').toISOString(), maxMarks: 50, obtainedMarks: 45, status: 'graded' },
      { id: 'asgn-2', title: 'Final Project', dueDate: new Date('2026-05-15').toISOString(), maxMarks: 100, status: 'pending' },
    ]
  }
];

router.get('/dashboard', async (req, res) => {
  try {
    if (NO_DB_MODE) {
      const courses = MOCK_LMS_COURSES;
      const avgAttendance = 88.5;
      return res.json({ success: true, data: { courses, stats: { totalCourses: courses.length, avgAttendance, totalCredits: 4 } } });
    }

    const courses = await prisma.lmsCourse.findMany({
      where: { userId: req.user!.userId },
      include: { assignments: { orderBy: { dueDate: 'asc' } } },
    });
    
    const enrollments = courses.map(c => ({
      course_id: c.id,
      course_code: c.courseCode,
      course_name: c.courseName,
      credits: c.credits,
      semester: c.semester,
      faculty_name: c.faculty
    }));

    const upcoming_assignments = courses.flatMap(c => 
      c.assignments.map(a => ({
        id: a.id,
        title: a.title,
        due_date: a.dueDate,
        max_marks: a.maxMarks
      }))
    );

    const avgAttendance = courses.length > 0
      ? (courses.reduce((s, c) => s + c.attendance, 0) / courses.length).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        enrollments,
        upcoming_assignments,
        grade_summary: {
          total: courses.length,
          average: courses.length ? (courses.reduce((s, c) => s + (c.grade === 'A' ? 90 : c.grade === 'B' ? 80 : 70), 0) / courses.length).toFixed(0) : 0
        },
        attendance_rate: avgAttendance
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch LMS data' });
  }
});

router.get('/courses', async (req, res) => {
  if (NO_DB_MODE) return res.json({ success: true, data: MOCK_LMS_COURSES });
  const courses = await prisma.lmsCourse.findMany({ where: { userId: req.user!.userId }, include: { assignments: true } });
  res.json({ success: true, data: courses });
});

router.get('/courses/:id', async (req, res) => {
  if (NO_DB_MODE) {
    const course = MOCK_LMS_COURSES.find(c => c.id === req.params.id) || MOCK_LMS_COURSES[0];
    return res.json({ success: true, data: course });
  }
  const course = await prisma.lmsCourse.findFirst({ where: { id: req.params.id, userId: req.user!.userId }, include: { assignments: true } });
  if (!course) return res.status(404).json({ success: false, error: 'Course not found' });
  res.json({ success: true, data: course });
});

router.get('/grades', async (req, res) => {
  if (NO_DB_MODE) return res.json({ success: true, data: MOCK_LMS_COURSES.map(c => ({ courseCode: c.courseCode, courseName: c.courseName, credits: c.credits, grade: c.grade, semester: c.semester })) });
  const courses = await prisma.lmsCourse.findMany({ where: { userId: req.user!.userId }, select: { courseCode: true, courseName: true, credits: true, grade: true, semester: true } });
  res.json({ success: true, data: courses });
});

router.get('/attendance', async (req, res) => {
  if (NO_DB_MODE) return res.json({ success: true, data: MOCK_LMS_COURSES.map(c => ({ courseCode: c.courseCode, courseName: c.courseName, attendance: c.attendance })) });
  const courses = await prisma.lmsCourse.findMany({ where: { userId: req.user!.userId }, select: { courseCode: true, courseName: true, attendance: true } });
  res.json({ success: true, data: courses });
});

export { router as lmsRouter };
