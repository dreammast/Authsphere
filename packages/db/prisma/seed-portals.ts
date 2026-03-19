import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Portal Data...');

  // Get all users
  const users = await prisma.user.findMany();
  
  if (users.length === 0) {
    console.log('No users found. Creating a test user...');
    const testUser = await prisma.user.create({
      data: {
        email: 'testuser@veltech.edu.in',
        studentId: 'VTU' + Math.floor(10000 + Math.random() * 90000),
        name: 'Test Student',
        role: 'STUDENT',
      }
    });
    users.push(testUser);
  }

  for (const user of users) {
    console.log(`Seeding portals for ${user.email}...`);

    // 1. LMS Courses
    const lmsCount = await prisma.lmsCourse.count({ where: { userId: user.id } });
    if (lmsCount === 0) {
      await prisma.lmsCourse.create({
        data: {
           userId: user.id,
           courseCode: 'CS301',
           courseName: 'Advanced Web Development',
           faculty: 'Dr. Smith',
           credits: 4,
           semester: 5,
           attendance: 88.5,
           grade: 'A',
           assignments: {
             create: [
               { title: 'Project Phase 1', dueDate: new Date('2026-04-01'), maxMarks: 50, obtainedMarks: 45, status: 'graded' },
               { title: 'Final Project', dueDate: new Date('2026-05-15'), maxMarks: 100, status: 'pending' },
             ]
           }
        }
      });
      console.log('  - Added LMS Course');
    }

    // 2. ERP - Fee Records
    const feeCount = await prisma.feeRecord.count({ where: { userId: user.id } });
    if (feeCount === 0) {
      await prisma.feeRecord.create({
        data: {
           userId: user.id,
           description: 'Tuition Fee - Semester 5',
           amount: 50000,
           dueDate: new Date('2026-01-15'),
           paidDate: new Date('2026-01-14'),
           status: 'PAID',
           semester: 5
        }
      });
      console.log('  - Added Fee Record');
    }

    // 3. Library Books
    const bookIssueCount = await prisma.bookIssue.count({ where: { userId: user.id } });
    if (bookIssueCount === 0) {
      let book = await prisma.book.findFirst({ where: { isbn: '978-0134685991' } });
      if (!book) {
        book = await prisma.book.create({
          data: {
             title: 'Effective Java',
             author: 'Joshua Bloch',
             isbn: '978-0134685991',
             category: 'Programming',
             totalCopies: 5,
             available: 4
          }
        });
      }
      
      await prisma.bookIssue.create({
        data: {
           userId: user.id,
           bookId: book.id,
           issueDate: new Date('2026-03-01'),
           dueDate: new Date('2026-03-15'),
           status: 'ISSUED'
        }
      });
      console.log('  - Added Book Issue');
    }

    // 4. Email Messages
    const emailCount = await prisma.message.count({ where: { recipientId: user.id } });
    if (emailCount === 0) {
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || user; // Fallback to self if no admin
      
      await prisma.message.create({
        data: {
          senderId: adminUser.id,
          recipientId: user.id,
          subject: 'Welcome to Portals!',
          body: 'Your portal accounts have been provisioned successfully.',
          isRead: false
        }
      });
      console.log('  - Added Email Message');
    }
  }

  console.log('Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
