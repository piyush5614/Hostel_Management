import { Router } from 'express';
import { z } from 'zod';
import {
  approveActionRequest,
  createActionRequest,
  getAuditLogs,
  listActionRequests,
  writeAuditLog,
} from '../data/store.js';

const requestSchema = z.object({
  collegeId: z.string().uuid(),
  action: z.enum([
    'suspend_college',
    'activate_college',
    'transfer_ownership',
    'rotate_links',
    'emergency_read_only',
  ]),
  reasonCode: z.string().min(3),
  referenceId: z.string().min(3),
});

export const governanceRouter = Router();

governanceRouter.get('/actions', (_req, res) => {
  const items = listActionRequests();
  res.json({ count: items.length, items });
});

governanceRouter.post('/actions/request', (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid payload',
      issues: parsed.error.flatten(),
    });
    return;
  }

  const request = createActionRequest({
    ...parsed.data,
    requestedBy: req.actorName || 'platform-owner',
  });

  writeAuditLog({
    actor: req.actorName || 'platform-owner',
    action: `request_${request.action}`,
    targetType: 'governance',
    targetId: request.id,
    detail: `Requested privileged action ${request.action} for college ${request.collegeId}`,
  });

  res.status(201).json(request);
});

governanceRouter.post('/actions/:requestId/approve', (req, res) => {
  const approver = req.actorName || 'platform-owner';
  const request = approveActionRequest(req.params.requestId, approver);
  if (!request) {
    res.status(404).json({ error: 'Request not found' });
    return;
  }

  writeAuditLog({
    actor: approver,
    action: 'approve_privileged_action',
    targetType: 'governance',
    targetId: request.id,
    detail: `Approval count=${request.approvals.length} status=${request.approvalStatus}`,
  });

  res.json(request);
});

governanceRouter.get('/audit', (req, res) => {
  const limitInput = Number(req.query.limit || 20);
  const limit = Number.isNaN(limitInput) ? 20 : Math.min(Math.max(limitInput, 1), 100);
  const items = getAuditLogs(limit);

  res.json({ count: items.length, items });
});
