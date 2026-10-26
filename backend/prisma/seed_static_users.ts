import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING / UPDATING STATIC WORKFLOW USERS (Admin & Analyst) ---');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password@123', salt);

  // 1. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@citypharma.com' },
    update: {
      username: 'admin',
      passwordHash,
      fullName: 'Dr. Tariq Mahmood (Administrator)',
      department: 'QC & Administration',
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@citypharma.com',
      username: 'admin',
      passwordHash,
      fullName: 'Dr. Tariq Mahmood (Administrator)',
      employeeId: 'EMP-001',
      department: 'QC & Administration',
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('✓ Configured Administrator User:', adminUser.username, adminUser.email);

  // 2. Analyst User
  const analystUser = await prisma.user.upsert({
    where: { email: 'analyst@citypharma.com' },
    update: {
      username: 'analyst',
      passwordHash,
      fullName: 'Muhammad Ali (QC Analyst)',
      department: 'Quality Control Laboratory',
      role: Role.ANALYST,
      isActive: true,
    },
    create: {
      email: 'analyst@citypharma.com',
      username: 'analyst',
      passwordHash,
      fullName: 'Muhammad Ali (QC Analyst)',
      employeeId: 'EMP-ANL-01',
      department: 'Quality Control Laboratory',
      role: Role.ANALYST,
      isActive: true,
    },
  });
  console.log('✓ Configured Analyst User:', analystUser.username, analystUser.email);

  // Purge any other users so only these two exist
  await prisma.user.deleteMany({
    where: {
      email: {
        notIn: ['admin@citypharma.com', 'analyst@citypharma.com'],
      },
    },
  });

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      department: true,
      role: true,
    },
    orderBy: { role: 'asc' },
  });
  console.table(allUsers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
