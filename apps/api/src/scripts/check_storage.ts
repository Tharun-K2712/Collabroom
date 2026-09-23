import { prisma } from '../config/db';

async function check() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, storageUsedBytes: true }
  });
  console.log('--- USER STORAGE AUDIT ---');
  for (const u of users) {
    const sum = await prisma.file.aggregate({
      where: { uploadedById: u.id, isTrash: false },
      _sum: { sizeBytes: true }
    });
    const actual = sum._sum.sizeBytes || BigInt(0);
    console.log('User:', u.email, '| DB Stored:', u.storageUsedBytes.toString(), '| Actual Sum:', actual.toString());
  }
}

check().finally(() => prisma.$disconnect());
