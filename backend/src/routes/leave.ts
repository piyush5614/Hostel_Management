import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { resolveCollegeId } from '../utils/tenant.js';

const router = Router();

// GET all leave requests (admin/warden see all, students see their own)
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb();
    const user = (req as any).user;
    const collegeId = resolveCollegeId(user?.collegeId);

    let leaveRequests;
    if (user.role === 'admin' || user.role === 'warden') {
      leaveRequests = await db.all(`
        SELECT lr.*, u.name as student_name, s.guardian_name, s.guardian_contact
        FROM leave_requests lr
        LEFT JOIN students s ON lr.student_id = s.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE lr.college_id = ?
        ORDER BY lr.submitted_at DESC
      `, [collegeId]);
    } else {
      // Students see only their own
      const student = await db.get(
        'SELECT id FROM students WHERE user_id = ? AND college_id = ?',
        [user.userId, collegeId]
      );
      if (!student) {
        res.json([]);
        return;
      }
      leaveRequests = await db.all(
        'SELECT * FROM leave_requests WHERE student_id = ? AND college_id = ? ORDER BY submitted_at DESC',
        [student.id, collegeId]
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
    const collegeId = resolveCollegeId(req.user?.collegeId);
    const { studentId, type, startDate, endDate, reason, emergencyContact } = req.body;

    const student = await db.get(
      'SELECT id FROM students WHERE id = ? AND college_id = ?',
      [studentId, collegeId]
    );

    if (!student) {
      res.status(404).json({ error: 'Student not found for this college' });
      return;
    }

    const id = uuidv4();
    await db.run(
      `INSERT INTO leave_requests (
        id, college_id, student_id, type, start_date, end_date, reason, emergency_contact, status, submitted_at
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
      [id, collegeId, studentId, type, startDate, endDate, reason, emergencyContact || null]
    );

    const leaveRequest = await db.get('SELECT * FROM leave_requests WHERE id = ? AND college_id = ?', [id, collegeId]);
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
      const collegeId = resolveCollegeId(user?.collegeId);
      const { notes } = req.body;

      const leaveRequest = await db.get(
        'SELECT * FROM leave_requests WHERE id = ? AND college_id = ?',
        [req.params.id, collegeId]
      );
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
         WHERE id = ? AND college_id = ?`,
        [notes || '', user.userId, req.params.id, collegeId]
      );

      const updated = await db.get(
        'SELECT * FROM leave_requests WHERE id = ? AND college_id = ?',
        [req.params.id, collegeId]
      );
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
      const collegeId = resolveCollegeId(user?.collegeId);
      const { approverComments } = req.body;

      const leaveRequest = await db.get(
        'SELECT * FROM leave_requests WHERE id = ? AND college_id = ?',
        [req.params.id, collegeId]
      );
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
         WHERE id = ? AND college_id = ?`,
        [user.userId, req.params.id, collegeId]
      );

      // Update student status to 'on-leave'
      await db.run(
        "UPDATE students SET current_status = 'on-leave' WHERE id = ? AND college_id = ?",
        [leaveRequest.student_id, collegeId]
      );

      const updated = await db.get(
        'SELECT * FROM leave_requests WHERE id = ? AND college_id = ?',
        [req.params.id, collegeId]
      );
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
      const collegeId = resolveCollegeId(user?.collegeId);
      const { approverComments } = req.body;

      await db.run(
        `UPDATE leave_requests
         SET status = 'rejected',
             reviewed_at = datetime('now'),
             reviewed_by = ?,
             parent_approval_status = 'rejected'
         WHERE id = ? AND college_id = ?`,
        [user.userId, req.params.id, collegeId]
      );

      const updated = await db.get(
        'SELECT * FROM leave_requests WHERE id = ? AND college_id = ?',
        [req.params.id, collegeId]
      );
      res.json(updated);
    } catch (error) {
      console.error('Reject leave request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
