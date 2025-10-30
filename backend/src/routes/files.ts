import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/org.js';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

async function assertProjectOrg(projectId: string, orgId: string) {
  const p = await prisma.project.findFirst({ where: { id: projectId, orgId } });
  if (!p) throw Object.assign(new Error('Project not found'), { status: 404 });
}

router.get('/projects/:projectId/files', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const { projectId } = req.params as any;
    await assertProjectOrg(projectId, (req as any).orgId);
    const files = await prisma.projectFile.findMany({ where: { projectId }, include: { currentVersion: true } });
    res.json(files);
  } catch (e) { next(e); }
});

router.post('/projects/:projectId/files', requireAuth, requireOrg, upload.single('file'), async (req, res, next) => {
  try {
    const { projectId } = req.params as any;
    await assertProjectOrg(projectId, (req as any).orgId);
    const name = (req.body?.name as string) || req.file?.originalname || 'file';
    const storageDir = process.env.STORAGE_DIR || 'storage';
    const hash = crypto.createHash('sha256').update(req.file!.buffer).digest('hex');
    let file = await prisma.projectFile.findFirst({ where: { projectId, name } });
    if (!file) file = await prisma.projectFile.create({ data: { projectId, name } });
    const latest = await prisma.fileVersion.findFirst({ where: { fileId: file.id }, orderBy: { version: 'desc' } });
    const version = (latest?.version || 0) + 1;
    const folder = path.join(storageDir, file.id);
    await fs.mkdir(folder, { recursive: true });
    const filename = `${version}-${hash.slice(0,8)}-${name}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = path.join(folder, filename);
    await fs.writeFile(storagePath, req.file!.buffer);
    const ver = await prisma.fileVersion.create({ data: { fileId: file.id, version, hash, size: req.file!.size, mimeType: req.file!.mimetype, storagePath, uploadedById: (req as any).user?.id ?? null, note: (req.body?.note as string) ?? null } });
    await prisma.projectFile.update({ where: { id: file.id }, data: { currentVersionId: ver.id } });
    res.status(201).json({ file, version: ver });
  } catch (e) { next(e); }
});

router.get('/files/:fileId/versions', requireAuth, requireOrg, async (req, res, next) => {
  try { const versions = await prisma.fileVersion.findMany({ where: { fileId: req.params.fileId }, orderBy: { version: 'desc' } }); res.json(versions); } catch (e) { next(e); }
});

router.post('/files/:fileId/versions', requireAuth, requireOrg, upload.single('file'), async (req, res, next) => {
  try {
    const file = await prisma.projectFile.findUnique({ where: { id: req.params.fileId } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    await assertProjectOrg(file.projectId, (req as any).orgId);
    const storageDir = process.env.STORAGE_DIR || 'storage';
    const hash = crypto.createHash('sha256').update(req.file!.buffer).digest('hex');
    const latest = await prisma.fileVersion.findFirst({ where: { fileId: file.id }, orderBy: { version: 'desc' } });
    const version = (latest?.version || 0) + 1;
    const folder = path.join(storageDir, file.id);
    await fs.mkdir(folder, { recursive: true });
    const filename = `${version}-${hash.slice(0,8)}-${req.file?.originalname || 'file'}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = path.join(folder, filename);
    await fs.writeFile(storagePath, req.file!.buffer);
    const ver = await prisma.fileVersion.create({ data: { fileId: file.id, version, hash, size: req.file!.size, mimeType: req.file!.mimetype, storagePath, uploadedById: (req as any).user?.id ?? null } });
    await prisma.projectFile.update({ where: { id: file.id }, data: { currentVersionId: ver.id } });
    res.status(201).json(ver);
  } catch (e) { next(e); }
});

router.get('/files/:fileId/download', requireAuth, requireOrg, async (req, res, next) => {
  try {
    const file = await prisma.projectFile.findUnique({ where: { id: req.params.fileId }, include: { currentVersion: true } });
    if (!file) return res.status(404).json({ error: 'File not found' });
    await assertProjectOrg(file.projectId, (req as any).orgId);
    let verId = req.query.version as string | undefined;
    let ver = file.currentVersion;
    if (verId) ver = await prisma.fileVersion.findUnique({ where: { id: verId } }) || undefined;
    if (!ver) return res.status(404).json({ error: 'Version not found' });
    res.setHeader('Content-Type', ver.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    const buf = await fs.readFile(ver.storagePath);
    res.send(buf);
  } catch (e) { next(e); }
});

export default router;

