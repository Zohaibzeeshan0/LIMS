import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING / UPDATING STATIC 3-LAB USERS ---');

  const salt = await bcrypt.genSalt(10);
  const analystPasswordHash = await bcrypt.hash('Password@123', salt);
  const adminPasswordHash = await bcrypt.hash('Admin@1234', salt);

  // Ensure Laboratories exist
  const existingLabs = await prisma.laboratory.findMany();
  console.log('Current Labs in DB:', existingLabs);

  const genExisting = existingLabs.find((l) => l.code === 'GEN' || l.code === 'GL' || l.name.toLowerCase().includes('general'));
  if (genExisting) {
    await prisma.laboratory.update({ where: { id: genExisting.id }, data: { name: 'General Lab', code: 'GEN', isActive: true } });
  } else {
    await prisma.laboratory.create({ data: { name: 'General Lab', code: 'GEN', isActive: true } });
  }

  const penExisting = existingLabs.find((l) => l.code === 'PEN' || l.code === 'PL' || l.name.toLowerCase().includes('penicillin'));
  if (penExisting) {
    await prisma.laboratory.update({ where: { id: penExisting.id }, data: { name: 'Penicillin Lab', code: 'PEN', isActive: true } });
  } else {
    await prisma.laboratory.create({ data: { name: 'Penicillin Lab', code: 'PEN', isActive: true } });
  }

  const cephExisting = existingLabs.find((l) => l.code === 'CEPH' || l.code === 'CP' || l.code === 'SAF' || l.code === 'SEF' || l.name.toLowerCase().includes('ceph') || l.name.toLowerCase().includes('saf'));
  if (cephExisting) {
    await prisma.laboratory.update({ where: { id: cephExisting.id }, data: { name: 'Cephalosporin Lab', code: 'CEPH', isActive: true } });
  } else {
    await prisma.laboratory.create({ data: { name: 'Cephalosporin Lab', code: 'CEPH', isActive: true } });
  }
  console.log('✓ Configured Laboratories: General Lab (GEN), Penicillin Lab (PEN), Cephalosporin Lab (CEPH)');

  // 1. Cephalosporin Lab Static User: ceph.analyst
  const cephUser = await prisma.user.upsert({
    where: { email: 'ceph.analyst@citypharma.com' },
    update: {
      username: 'ceph.analyst',
      passwordHash: analystPasswordHash,
      fullName: 'Cephalosporin Lab Analyst',
      department: 'Cephalosporin Laboratory',
      role: Role.QC_ANALYST,
      isActive: true,
    },
    create: {
      email: 'ceph.analyst@citypharma.com',
      username: 'ceph.analyst',
      passwordHash: analystPasswordHash,
      fullName: 'Cephalosporin Lab Analyst',
      employeeId: 'EMP-CP-01',
      department: 'Cephalosporin Laboratory',
      role: Role.QC_ANALYST,
      isActive: true,
    },
  });
  console.log('✓ Configured Cephalosporin Lab User:', cephUser.username, cephUser.email);

  // 2. Penicillin Lab Static User: pen.analyst
  const penUser = await prisma.user.upsert({
    where: { email: 'pen.analyst@citypharma.com' },
    update: {
      username: 'pen.analyst',
      passwordHash: analystPasswordHash,
      fullName: 'Penicillin Lab Analyst',
      department: 'Penicillin Laboratory',
      role: Role.QC_ANALYST,
      isActive: true,
    },
    create: {
      email: 'pen.analyst@citypharma.com',
      username: 'pen.analyst',
      passwordHash: analystPasswordHash,
      fullName: 'Penicillin Lab Analyst',
      employeeId: 'EMP-PEN-02',
      department: 'Penicillin Laboratory',
      role: Role.QC_ANALYST,
      isActive: true,
    },
  });
  console.log('✓ Configured Penicillin Lab User:', penUser.username, penUser.email);

  // 3. General Lab Static User: gen.analyst
  const genUser = await prisma.user.upsert({
    where: { email: 'gen.analyst@citypharma.com' },
    update: {
      username: 'gen.analyst',
      passwordHash: analystPasswordHash,
      fullName: 'General Lab Analyst',
      department: 'General Laboratory',
      role: Role.QC_ANALYST,
      isActive: true,
    },
    create: {
      email: 'gen.analyst@citypharma.com',
      username: 'gen.analyst',
      passwordHash: analystPasswordHash,
      fullName: 'General Lab Analyst',
      employeeId: 'EMP-GEN-02',
      department: 'General Laboratory',
      role: Role.QC_ANALYST,
      isActive: true,
    },
  });
  console.log('✓ Configured General Lab User:', genUser.username, genUser.email);

  // 4. Admin User: admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@citypharma.com' },
    update: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      department: 'QC & Regulatory Affairs',
      role: Role.ADMIN,
      isActive: true,
    },
    create: {
      email: 'admin@citypharma.com',
      username: 'admin',
      passwordHash: adminPasswordHash,
      fullName: 'Dr. Tariq Mahmood',
      employeeId: 'EMP-001',
      department: 'QC & Regulatory Affairs',
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log('✓ Configured Administrator User:', adminUser.username, adminUser.email);

  // Synchronize existing aliases so legacy logins also work with Password@123
  await prisma.user.updateMany({
    where: {
      email: {
        in: [
          'saf.analyst@citypharma.com',
          'penicillin.analyst@citypharma.com',
          'general.analyst@citypharma.com',
          'qc.analyst@citypharma.com',
          'lab.tech@citypharma.com',
          'qa.manager@citypharma.com',
        ],
      },
    },
    data: {
      passwordHash: analystPasswordHash,
    },
  });
  console.log('✓ Synchronized legacy user hashes with Password@123');

  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      department: true,
      role: true,
    },
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
