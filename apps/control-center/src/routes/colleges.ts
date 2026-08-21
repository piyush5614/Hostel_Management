import { Router } from 'express';
import { z } from 'zod';
import { createCollege, getCollegeById, listColleges, updateCollege, writeAuditLog } from '../data/store.js';

const statusSchema = z.enum(['active', 'suspended', 'onboarding', 'archived']);

const createCollegeSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  status: statusSchema,
  contactEmail: z.string().email(),
  domain: z.string().min(3),
  region: z.string().min(2),
  activeStudents: z.number().int().nonnegative(),
  activeStaff: z.number().int().nonnegative(),
  plan: z.enum(['starter', 'growth', 'enterprise']),
  links: z.object({
    appUrl: z.string().url(),
    adminUrl: z.string().url(),
    onboardingUrl: z.string().url(),
    supportUrl: z.string().url().optional(),
  }),
});

const updateCollegeSchema = createCollegeSchema.partial();

export const collegesRouter = Router();

collegesRouter.get('/', (req, res) => {
  const status = req.query.status;
  const search = req.query.search;

  const parsedStatus = typeof status === 'string' ? statusSchema.safeParse(status) : null;
  if (parsedStatus && !parsedStatus.success) {
    res.status(400).json({ error: 'Invalid status filter' });
    return;
  }

  const colleges = listColleges({
    status: parsedStatus?.success ? parsedStatus.data : undefined,
    search: typeof search === 'string' ? search : undefined,
  });

  res.json({ count: colleges.length, items: colleges });
});

collegesRouter.get('/:collegeId', (req, res) => {
  const college = getCollegeById(req.params.collegeId);
  if (!college) {
    res.status(404).json({ error: 'College not found' });
    return;
  }

  res.json(college);
});

collegesRouter.post('/', (req, res) => {
  const parsed = createCollegeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid payload',
      issues: parsed.error.flatten(),
    });
    return;
  }

  const record = createCollege(parsed.data);
  writeAuditLog({
    actor: req.actorName || 'platform-owner',
    action: 'college_created',
    targetType: 'college',
    targetId: record.id,
    detail: `Created college ${record.name}`,
  });

  res.status(201).json(record);
});

collegesRouter.patch('/:collegeId', (req, res) => {
  const parsed = updateCollegeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid payload',
      issues: parsed.error.flatten(),
    });
    return;
  }

  const updated = updateCollege(req.params.collegeId, parsed.data);
  if (!updated) {
    res.status(404).json({ error: 'College not found' });
    return;
  }

  writeAuditLog({
    actor: req.actorName || 'platform-owner',
    action: 'college_updated',
    targetType: 'college',
    targetId: updated.id,
    detail: `Updated college ${updated.name}`,
  });

  res.json(updated);
});
