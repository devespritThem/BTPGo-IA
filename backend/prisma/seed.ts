import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL || 'owner@btpgo.local';
  const password = process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!';
  const orgSlug = process.env.SEED_ORG_SLUG || 'demo';
  const orgName = process.env.SEED_ORG_NAME || 'Demo Org';

  const hash = await bcrypt.hash(password, 10);

  const org = await prisma.org.upsert({
    where: { slug: orgSlug },
    update: {},
    create: { slug: orgSlug, name: orgName },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { defaultOrgId: org.id },
    create: { email, password: hash, role: 'user', defaultOrgId: org.id },
  });
  await prisma.userOrg.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: { role: 'owner' },
    create: { userId: user.id, orgId: org.id, role: 'owner' },
  });

  // Sample under org
  await prisma.marche.create({ data: { title: 'Marche public 001', orgId: org.id } }).catch(() => {});
  await prisma.devis.create({ data: { ref: 'DV-0001', amount: 10000, orgId: org.id } }).catch(() => {});
  await prisma.chantier.create({ data: { name: 'Chantier Alpha', address: '1 Rue des Tests, Paris', orgId: org.id } }).catch(() => {});

  // eslint-disable-next-line no-console
  console.log('Seeded org and owner:', { org: { slug: org.slug }, user: { email: user.email } });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

