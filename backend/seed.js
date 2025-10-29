import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

dotenv.config();
const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL || 'owner@btpgo.local';
  const password = process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!';
  const orgSlug = process.env.SEED_ORG_SLUG || 'demo';
  const orgName = process.env.SEED_ORG_NAME || 'Demo Org';

  const hash = await bcrypt.hash(password, 10);

  // Create Org
  const org = await prisma.org.upsert({
    where: { slug: orgSlug },
    update: {},
    create: { slug: orgSlug, name: orgName },
  });

  // Create user and link to org (org-level role = owner; user.role kept as 'user')
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
  /* eslint-disable no-console */
  console.log('Seeded:', { org: { id: org.id, slug: org.slug }, user: { id: user.id, email: user.email } });

  // Sample business data under org
  await prisma.marche.create({ data: { title: 'Marché public 001', orgId: org.id } }).catch(() => {});
  await prisma.devis.create({ data: { ref: 'DV-0001', amount: 10000, orgId: org.id } }).catch(() => {});
  await prisma.chantier.create({ data: { name: 'Chantier Alpha', address: '1 Rue des Tests, Paris', orgId: org.id } }).catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
