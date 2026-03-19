import { PrismaClient, Role, FeeStatus, IssueStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AuthSphere database...');

  // ── USERS ─────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'vtu24464@veltech.edu.in' },
      update: {},
      create: {
        email: 'vtu24464@veltech.edu.in',
        studentId: 'VTU24464',
        name: 'Arun Kumar',
        role: Role.STUDENT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'vtu24617@veltech.edu.in' },
      update: {},
      create: {
        email: 'vtu24617@veltech.edu.in',
        studentId: 'VTU24617',
        name: 'Priya Nair',
        role: Role.STUDENT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'vtu24446@veltech.edu.in' },
      update: {},
      create: {
        email: 'vtu24446@veltech.edu.in',
        studentId: 'VTU24446',
        name: 'Rajan Mehta',
        role: Role.STUDENT,
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin@veltech.edu.in' },
      update: {},
      create: {
        email: 'admin@veltech.edu.in',
        studentId: 'ADMIN001',
        name: 'Campus Admin',
        role: Role.ADMIN,
      },
    }),
  ]);

  const [student1, student2, student3, admin] = users;
  console.log('✅ Users seeded');

  // ── LMS DATA ──────────────────────────────────────────
  const courses1 = [
    { courseCode: 'CS301', courseName: 'Data Structures & Algorithms', faculty: 'Dr. Sharma', credits: 4, semester: 6, attendance: 88, grade: 'A' },
    { courseCode: 'CS302', courseName: 'Database Management Systems', faculty: 'Dr. Patel', credits: 3, semester: 6, attendance: 92, grade: 'A+' },
    { courseCode: 'CS303', courseName: 'Operating Systems', faculty: 'Dr. Rao', credits: 4, semester: 6, attendance: 78, grade: 'B+' },
    { courseCode: 'CS304', courseName: 'Computer Networks', faculty: 'Dr. Kumar', credits: 3, semester: 6, attendance: 95, grade: 'A' },
    { courseCode: 'CS305', courseName: 'Software Engineering', faculty: 'Dr. Iyer', credits: 3, semester: 6, attendance: 85, grade: 'A' },
  ];

  for (const course of courses1) {
    const c = await prisma.lmsCourse.upsert({
      where: { id: `${student1.id}-${course.courseCode}` },
      update: {},
      create: { ...course, userId: student1.id, id: `${student1.id}-${course.courseCode}` },
    });
    await prisma.assignment.createMany({
      data: [
        { courseId: c.id, title: `${course.courseName} Assignment 1`, dueDate: new Date('2025-03-20'), maxMarks: 20, obtainedMarks: 18, status: 'graded' },
        { courseId: c.id, title: `${course.courseName} Mid-Term`, dueDate: new Date('2025-04-05'), maxMarks: 50, obtainedMarks: 44, status: 'graded' },
      ],
      skipDuplicates: true,
    });
  }

  // Seed courses for student2 & student3 similarly
  const courses2 = [
    { courseCode: 'EC301', courseName: 'Signals & Systems', faculty: 'Dr. Reddy', credits: 4, semester: 5, attendance: 91, grade: 'A+' },
    { courseCode: 'EC302', courseName: 'Digital Electronics', faculty: 'Dr. Menon', credits: 3, semester: 5, attendance: 87, grade: 'A' },
    { courseCode: 'EC303', courseName: 'Communication Systems', faculty: 'Dr. Singh', credits: 4, semester: 5, attendance: 79, grade: 'B+' },
    { courseCode: 'EC304', courseName: 'VLSI Design', faculty: 'Dr. Verma', credits: 3, semester: 5, attendance: 93, grade: 'A' },
  ];
  for (const course of courses2) {
    const c = await prisma.lmsCourse.upsert({
      where: { id: `${student2.id}-${course.courseCode}` },
      update: {},
      create: { ...course, userId: student2.id, id: `${student2.id}-${course.courseCode}` },
    });
    await prisma.assignment.createMany({
      data: [{ courseId: c.id, title: `${course.courseName} Project`, dueDate: new Date('2025-04-15'), maxMarks: 30, obtainedMarks: 28, status: 'graded' }],
      skipDuplicates: true,
    });
  }
  console.log('✅ LMS data seeded');

  // ── ERP DATA ──────────────────────────────────────────
  // Student 1 fees
  await prisma.feeRecord.createMany({
    data: [
      { userId: student1.id, description: 'Tuition Fee - Semester 6', amount: 45000, dueDate: new Date('2025-01-31'), paidDate: new Date('2025-01-28'), status: FeeStatus.PAID, semester: 6, fine: 0 },
      { userId: student1.id, description: 'Exam Fee - Semester 6', amount: 3500, dueDate: new Date('2025-03-15'), status: FeeStatus.PENDING, semester: 6, fine: 0 },
    ],
    skipDuplicates: true,
  });

  // Student 2 fees (all paid)
  await prisma.feeRecord.createMany({
    data: [
      { userId: student2.id, description: 'Tuition Fee - Semester 5', amount: 45000, dueDate: new Date('2024-08-31'), paidDate: new Date('2024-08-25'), status: FeeStatus.PAID, semester: 5, fine: 0 },
      { userId: student2.id, description: 'Lab Fee - Semester 5', amount: 5000, dueDate: new Date('2024-09-15'), paidDate: new Date('2024-09-10'), status: FeeStatus.PAID, semester: 5, fine: 0 },
    ],
    skipDuplicates: true,
  });

  // Student 3 fees (one overdue)
  await prisma.feeRecord.createMany({
    data: [
      { userId: student3.id, description: 'Tuition Fee - Semester 6', amount: 45000, dueDate: new Date('2025-01-31'), paidDate: new Date('2025-01-30'), status: FeeStatus.PAID, semester: 6, fine: 0 },
      { userId: student3.id, description: 'Hostel Fee - Q1 2025', amount: 18000, dueDate: new Date('2025-02-01'), status: FeeStatus.OVERDUE, semester: 6, fine: 500 },
      { userId: student3.id, description: 'Transport Fee - 2025', amount: 8000, dueDate: new Date('2025-03-01'), status: FeeStatus.PENDING, semester: 6, fine: 0 },
    ],
    skipDuplicates: true,
  });

  // Hostel
  await prisma.hostelAllotment.upsert({
    where: { userId: student1.id },
    update: {},
    create: { userId: student1.id, block: 'A', roomNumber: '101', bedNumber: 1, joinDate: new Date('2023-06-01'), monthlyRent: 6000 },
  });
  await prisma.hostelAllotment.upsert({
    where: { userId: student3.id },
    update: {},
    create: { userId: student3.id, block: 'B', roomNumber: '205', bedNumber: 2, joinDate: new Date('2023-06-01'), monthlyRent: 6000 },
  });

  // Transport
  await prisma.transportPass.upsert({
    where: { userId: student3.id },
    update: {},
    create: { userId: student3.id, routeNumber: '3', routeName: 'Avadi - VelTech', pickupPoint: 'Avadi Bus Stop', passExpiry: new Date('2025-12-31'), isActive: true },
  });
  console.log('✅ ERP data seeded');

  // ── LIBRARY DATA ──────────────────────────────────────
  const books = await Promise.all([
    prisma.book.upsert({ where: { isbn: '978-0-13-110362-7' }, update: {}, create: { title: 'The C Programming Language', author: 'Kernighan & Ritchie', isbn: '978-0-13-110362-7', category: 'Programming', totalCopies: 5, available: 3 } }),
    prisma.book.upsert({ where: { isbn: '978-0-201-63361-0' }, update: {}, create: { title: 'The Pragmatic Programmer', author: 'Hunt & Thomas', isbn: '978-0-201-63361-0', category: 'Software Engineering', totalCopies: 3, available: 1 } }),
    prisma.book.upsert({ where: { isbn: '978-0-13-468599-1' }, update: {}, create: { title: 'Clean Code', author: 'Robert C. Martin', isbn: '978-0-13-468599-1', category: 'Software Engineering', totalCopies: 4, available: 2 } }),
    prisma.book.upsert({ where: { isbn: '978-0-596-51774-8' }, update: {}, create: { title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', isbn: '978-0-596-51774-8', category: 'Web Development', totalCopies: 2, available: 0 } }),
  ]);

  const now = new Date();
  const dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 days
  const overdueDue = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // -5 days (overdue)

  await prisma.bookIssue.createMany({
    data: [
      { userId: student1.id, bookId: books[0].id, dueDate, status: IssueStatus.ISSUED },
      { userId: student1.id, bookId: books[2].id, dueDate, status: IssueStatus.ISSUED },
      { userId: student2.id, bookId: books[3].id, dueDate: overdueDue, status: IssueStatus.OVERDUE, fine: 10 },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Library data seeded');

  // ── MESSAGES ──────────────────────────────────────────
  await prisma.message.createMany({
    data: [
      { senderId: admin.id, recipientId: student1.id, subject: 'Welcome to VelTech Campus Portal', body: 'Dear Arun, Your AuthSphere account has been activated. You can now access all campus portals using biometric authentication.', isRead: true },
      { senderId: admin.id, recipientId: student1.id, subject: 'Fee Payment Reminder', body: 'Your Exam Fee for Semester 6 is due on March 15, 2025. Please make the payment to avoid fine.', isRead: false },
      { senderId: admin.id, recipientId: student2.id, subject: 'Exam Schedule Released', body: 'The Semester 5 final exam schedule has been released. Please check the LMS portal for details.', isRead: false },
      { senderId: admin.id, recipientId: student3.id, subject: 'Hostel Fee Overdue', body: 'Your hostel fee for Q1 2025 is overdue. A fine of ₹500 has been added. Please clear dues immediately.', isRead: false },
      { senderId: admin.id, recipientId: student3.id, subject: 'Library Book Return Reminder', body: 'You have an overdue library book. Please return it to avoid additional fines.', isRead: false },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Messages seeded');

  // ── ADMIN SEED DATA ──────────────────────────────────
  // Fee structure for CSE program
  await prisma.feeStructure.upsert({
    where: { program_semester: { program: 'CSE', semester: 6 } },
    update: {},
    create: { program: 'CSE', semester: 6, tuitionFee: 85000, examFee: 3500, labFee: 5000, hostelFee: 18000, transportFee: 8000 }
  });

  // System policies defaults
  const policies = [
    { key: 'fido2_required', value: 'false' },
    { key: 'max_otp_attempts', value: '5' },
    { key: 'jwt_expiry_minutes', value: '30' },
    { key: 'audit_retention_days', value: '90' },
  ];
  for (const p of policies) {
    await prisma.systemPolicy.upsert({ where: { key: p.key }, update: {}, create: p });
  }

  console.log('✅ Admin configuration seeded');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Test accounts:');
  console.log('   vtu24464@veltech.edu.in — Student (Arun Kumar)');
  console.log('   vtu24617@veltech.edu.in — Student (Priya Nair)');
  console.log('   vtu24446@veltech.edu.in — Student (Rajan Mehta)');
  console.log('   admin@veltech.edu.in    — Admin');
  console.log('\n📝 All users will get OTP on first login (no FIDO2 credential yet).');
  console.log('   After OTP, register device → subsequent logins use biometric.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
