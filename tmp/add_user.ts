import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const email = 'dreammasterorigin@gmail.com';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Test Admin',
      role: 'ADMIN',
    },
  });
  console.log('USER UPSERTED:', JSON.stringify(user, null, 2));
}
main().finally(() => prisma.$disconnect());
