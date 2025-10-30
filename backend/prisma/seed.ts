import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@btpgo.local';
  const password = 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: 'Admin' },
  });

  await prisma.project.create({ data: { name: 'Demo Project', ownerId: user.id } });
  // eslint-disable-next-line no-console
  console.log('Seeded user:', email, 'with password:', password);
}

main().finally(async () => {
  await prisma.$disconnect();
});

