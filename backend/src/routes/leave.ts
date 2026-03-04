import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET all leave requests (admin/warden see all, students see their own)
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = (req as any).user;

    let leaveRequests;
    if (user.role === 'admin' || user.role === 'warden') {
      leaveRequests = await db.all(`
        SELECT lr.*, s.name as student_name, s.guardian_name, s.guardian_contact
        FROM leave_requests lr
        LEFT JOIN students s ON lr.student_id = s.id
        ORDER BY lr.submitted_at DESC
      `);
    } else {
      // Students see only their own
      const student = await db.get('SELECT id FROM students WHERE user_id = ?', [user.userId]);
      if (!student) {
        res.json([]);
        return;
      }
      leaveRequests = await db.all(
        'SELECT * FROM leave_requests WHERE student_id = ? ORDER BY submitted_at DESC',
        [student.id]
      );
    }

    res.json(leaveRequests || []);
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create a new leave request
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const { studentId, type, startDate, endDate, reason, emergencyContact } = req.body;

    const id = uuidv4();
    await db.run(
      `INSERT INTO leave_requests (id, student_id, type, start_date, end_date, reason, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [id, studentId, type, startDate, endDate, reason]
    );

    const leaveRequest = await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    res.status(201).json(leaveRequest);
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH verify parent call — only admin/warden
router.patch(
  '/:id/verify-call',
  authenticate,
  authorize('admin', 'warden'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDb();
      const user = (req as any).user;
      const { notes } = req.body;

      const leaveRequest = await db.get('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
      if (!leaveRequest) {
        res.status(404).json({ error: 'Leave request not found' });
        return;
      }

      if (leaveRequest.status !== 'pending') {
        res.status(400).json({ error: 'Can only verify calls for pending leave requests' });
        return;
      }

      await db.run(
        `UPDATE leave_requests
         SET parent_call_verified = 1,
             parent_call_timestamp = datetime('now'),
             parent_call_notes = ?,
             parent_call_by = ?
         WHERE id = ?`,
        [notes || '', user.userId, req.params.id]
      );

      const updated = await db.get('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
      res.json(updated);
    } catch (error) {
      console.error('Verify parent call error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH approve leave — only admin/warden, requires parent call verification
router.patch(
  '/:id/approve',
  authenticate,
  authorize('admin', 'warden'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDb();
      const user = (req as any).user;
      const { approverComments } = req.body;

      const leaveRequest = await db.get('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
      if (!leaveRequest) {
        res.status(404).json({ error: 'Leave request not found' });
        return;
      }

      if (!leaveRequest.parent_call_verified) {
        res.status(400).json({ error: 'Parent call must be verified before approving' });
        return;
      }

      await db.run(
        `UPDATE leave_requests
         SET status = 'approved',
             reviewed_at = datetime('now'),
             reviewed_by = ?,
             parent_approval_status = 'approved'
         WHERE id = ?`,
        [user.userId, req.params.id]
      );

      // Update student status to 'on-leave'
      await db.run(
        "UPDATE students SET current_status = 'on-leave' WHERE id = ?",
        [leaveRequest.student_id]
      );

      const updated = await db.get('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
      res.json(updated);
    } catch (error) {
      console.error('Approve leave request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PATCH reject leave — admin/warden
router.patch(
  '/:id/reject',
  authenticate,
  authorize('admin', 'warden'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const db = await getDb();
      const user = (req as any).user;
      const { approverComments } = req.body;

      await db.run(
        `UPDATE leave_requests
         SET status = 'rejected',
             reviewed_at = datetime('now'),
             reviewed_by = ?,
             parent_approval_status = 'rejected'
         WHERE id = ?`,
        [user.userId, req.params.id]
      );

      const updated = await db.get('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
      res.json(updated);
    } catch (error) {
      console.error('Reject leave request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
